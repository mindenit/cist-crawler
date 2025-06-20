import type { IBaseModule, Response } from '@/types.js'
import { Fetcher } from '@/utils/fetcher.js'
import { JSONParser } from '@/utils/parser.js'

export class GroupsModule implements IBaseModule {
	private fetcher: Fetcher
	private parser: JSONParser

	constructor(servers?: string[], timeout?: number) {
		this.fetcher = new Fetcher(servers, timeout)
		this.parser = new JSONParser()
	}

	/**
	 * Get all info from groups route.
	 *
	 * @example Example usage:
	 * ```ts
	 * const groups = await cistCrawler.groups.findMany()
	 * ```
	 *
	 * @returns an array of group objects
	 *
	 * @publicApi
	 */
	async findMany(): Promise<Response> {
		const rawJson = await this.fetcher.fetchAndDecode(
			'/ias/app/tt/P_API_GROUP_JSON',
		)
		const result = this.parser.parseWithFallback<Response>(rawJson, 'groups')
		return result || []
	}
}
