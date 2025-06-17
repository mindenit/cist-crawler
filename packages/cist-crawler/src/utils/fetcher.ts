import { DEFAULT_CONFIG } from '@/index.js'
import { CistCrawlerError } from '@/error.js'

export class Fetcher {
	private servers: string[]
	private timeout: number

	constructor(
		servers: string[] = [...DEFAULT_CONFIG.servers],
		timeout: number = DEFAULT_CONFIG.timeout,
	) {
		this.servers = servers
		this.timeout = timeout
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
		const server = await this.getAvailableServer()
		const url = `https://${server}${endpoint}`

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
}
