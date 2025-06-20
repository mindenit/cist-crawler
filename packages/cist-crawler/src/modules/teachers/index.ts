import type { IBaseModule, Response } from '@/types.js'
import { Fetcher } from '@/utils/fetcher.js'
import { JSONParser } from '@/utils/parser.js'

export class TeachersModule implements IBaseModule {
	private fetcher: Fetcher
	private parser: JSONParser

	constructor(servers?: string[], timeout?: number) {
		this.fetcher = new Fetcher(servers, timeout)
		this.parser = new JSONParser()
	}

	/**
	 * Get all info from teachers route.
	 *
	 * @example Example usage:
	 * ```ts
	 * const teachers = await cistCrawler.teachers.findMany()
	 * ```
	 *
	 * @returns an array of teacher objects
	 *
	 * @publicApi
	 */
	async findMany(): Promise<Response> {
		let rawJson = await this.fetcher.fetchAndDecode(
			'/ias/app/tt/P_API_PODR_JSON',
		)

		// Apply teacher-specific preprocessing
		if (rawJson) {
			rawJson = rawJson.slice(0, -2) + ']}}'
		}

		const result = this.parser.parseWithFallback<Response>(rawJson, 'teachers')
		return result || []
	}
}
