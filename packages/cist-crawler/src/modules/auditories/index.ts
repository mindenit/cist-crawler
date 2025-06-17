import type { Response } from '@/types.js'
import { Fetcher } from '@/utils/fetcher.js'
import { JSONParser } from '@/utils/parser.js'
import type { IAuditoriesModule } from './types.js'

export class AuditoriesModule implements IAuditoriesModule {
	private fetcher: Fetcher
	private parser: JSONParser

	constructor(servers?: string[], timeout?: number) {
		this.fetcher = new Fetcher(servers, timeout)
		this.parser = new JSONParser()
	}

	/**
	 * Get all info from auditories route.
	 *
	 * @example Example usage:
	 * ```ts
	 * const auditories = await cistCrawler.auditories.findMany()
	 * ```
	 *
	 * @returns an array of building objects with auditories
	 *
	 * @publicApi
	 */
	async findMany(): Promise<Response> {
		const rawJson = await this.fetcher.fetchAndDecode(
			'/ias/app/tt/P_API_AUDITORIES_JSON',
		)
		const result = this.parser.parseWithFallback<Response>(
			rawJson,
			'auditories',
		)
		return result || []
	}
}
