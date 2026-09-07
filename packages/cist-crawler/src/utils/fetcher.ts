import { DEFAULT_CONFIG } from '@/index.js'
import { CistCrawlerError } from '@/error.js'

// ponytail: fixed TTL, not exposed as config; raise if health-checks still
// dominate request volume in practice
const SERVER_CACHE_TTL_MS = 60_000

// ponytail: fixed retry/backoff, not exposed as config; revisit if transient
// failures still slip through in practice
const RETRY_ATTEMPTS = 3
const RETRY_BACKOFF_MS = 300

// ponytail: fixed circuit-breaker thresholds, not exposed as config; revisit
// if a real outage needs a longer/shorter cooldown
const BREAKER_FAILURE_THRESHOLD = 3
const BREAKER_COOLDOWN_MS = 30_000

export class Fetcher {
	private servers: string[]
	private timeout: number
	private cachedServer?: { server: string; resolvedAt: number }
	private serverState = new Map<
		string,
		{ failures: number; openUntil: number }
	>()

	constructor(
		servers: string[] = [...DEFAULT_CONFIG.servers],
		timeout: number = DEFAULT_CONFIG.timeout,
	) {
		this.servers = servers
		this.timeout = timeout
	}

	private isServerOpen(server: string): boolean {
		const state = this.serverState.get(server)
		return state !== undefined && state.openUntil > Date.now()
	}

	private recordServerSuccess(server: string): void {
		this.serverState.delete(server)
	}

	private recordServerFailure(server: string): void {
		const state = this.serverState.get(server) ?? {
			failures: 0,
			openUntil: 0,
		}
		state.failures += 1

		if (state.failures >= BREAKER_FAILURE_THRESHOLD) {
			state.openUntil = Date.now() + BREAKER_COOLDOWN_MS
		}

		this.serverState.set(server, state)
	}

	private async resolveServer(): Promise<string> {
		if (
			this.cachedServer &&
			Date.now() - this.cachedServer.resolvedAt < SERVER_CACHE_TTL_MS
		) {
			return this.cachedServer.server
		}

		const server = await this.getAvailableServer()
		this.cachedServer = { server, resolvedAt: Date.now() }
		return server
	}

	async getAvailableServer(): Promise<string> {
		for (const server of this.servers) {
			if (this.isServerOpen(server)) {
				continue
			}

			try {
				const healthCheckUrl = `https://${server}/ias/app/tt/P_API_AUDITORIES_JSON`
				const controller = new AbortController()
				const timeoutId = setTimeout(() => controller.abort(), this.timeout)

				const response = await fetch(healthCheckUrl, {
					method: 'GET',
					signal: controller.signal,
				})

				clearTimeout(timeoutId)

				if (response.ok) {
					this.recordServerSuccess(server)
					return server
				}

				this.recordServerFailure(server)
			} catch (error) {
				this.recordServerFailure(server)
				console.warn(
					`Server ${server} is unavailable. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				)
			}
		}

		throw new CistCrawlerError('No available servers', 503)
	}

	async fetchAndDecode(endpoint: string): Promise<string> {
		const server = await this.resolveServer()
		const url = `https://${server}${endpoint}`

		let lastError: unknown
		let serverFaulted = false

		for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
			try {
				const result = await this.fetchOnce(url)
				this.recordServerSuccess(server)
				return result
			} catch (error) {
				lastError = error

				const isClientError =
					error instanceof CistCrawlerError &&
					error.status >= 400 &&
					error.status < 500

				if (isClientError) {
					break
				}

				if (attempt === RETRY_ATTEMPTS) {
					serverFaulted = true
					break
				}

				await this.sleep(RETRY_BACKOFF_MS * attempt)
			}
		}

		if (serverFaulted) {
			this.recordServerFailure(server)
			this.cachedServer = undefined
		}

		throw lastError
	}

	private async fetchOnce(url: string): Promise<string> {
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), this.timeout)

			const response = await fetch(url, { signal: controller.signal })
			clearTimeout(timeoutId)

			if (!response.ok) {
				throw new CistCrawlerError(
					`Network error: ${response.statusText}`,
					response.status,
				)
			}

			const buffer = await response.arrayBuffer()

			const decoder = new TextDecoder('windows-1251')
			let decodedBody = decoder.decode(buffer)

			const result = decodedBody.startsWith('\uFEFF')
				? decodedBody.substring(1)
				: decodedBody

			return result
		} catch (error) {
			if (error instanceof CistCrawlerError) {
				throw error
			}
			throw new CistCrawlerError(
				`Failed to fetch data from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
				500,
			)
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}
