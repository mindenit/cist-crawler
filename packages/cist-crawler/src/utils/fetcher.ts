import { DEFAULT_CONFIG } from '@/index.js'
import { CistCrawlerError } from '@/error.js'

// ponytail: fixed TTL, not exposed as config; raise if health-checks still
// dominate request volume in practice
const SERVER_CACHE_TTL_MS = 60_000

// ponytail: fixed retry/backoff, not exposed as config; revisit if transient
// failures still slip through in practice
const RETRY_ATTEMPTS = 3
const RETRY_BACKOFF_MS = 300

export class Fetcher {
	private servers: string[]
	private timeout: number
	private cachedServer?: { server: string; resolvedAt: number }

	constructor(
		servers: string[] = [...DEFAULT_CONFIG.servers],
		timeout: number = DEFAULT_CONFIG.timeout,
	) {
		this.servers = servers
		this.timeout = timeout
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
					return server
				}
			} catch (error) {
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
		for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
			try {
				return await this.fetchOnce(url)
			} catch (error) {
				lastError = error

				const isClientError =
					error instanceof CistCrawlerError &&
					error.status >= 400 &&
					error.status < 500

				if (isClientError || attempt === RETRY_ATTEMPTS) {
					break
				}

				await this.sleep(RETRY_BACKOFF_MS * attempt)
			}
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
