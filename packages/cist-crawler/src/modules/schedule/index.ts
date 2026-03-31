import type { IBaseModule, Response, ScheduleOptions } from '@/types.js'
import { Fetcher } from '@/utils/fetcher.js'
import { JSONParser } from '@/utils/parser.js'
import { fixEventTimestamps } from '@/utils/timestampFixer.js'

export class ScheduleModule implements IBaseModule {
	private fetcher: Fetcher
	private parser: JSONParser
	private clientId: string

	constructor(servers?: string[], timeout?: number, clientId?: string) {
		this.fetcher = new Fetcher(servers, timeout)
		this.parser = new JSONParser()
		this.clientId = clientId ?? 'KEY_NOT_PROVIDED'
	}

	/**
	 * Get schedule for group or teacher
	 *
	 * @example Example usage:
	 * ```ts
	 * // Get group schedule
	 * const groupSchedule = await cistCrawler.schedule.findMany({
	 *   type: 1,
	 *   id: 3547345
	 * })
	 *
	 * // Get teacher schedule
	 * const teacherSchedule = await cistCrawler.schedule.findMany({
	 *   type: 2,
	 *   id: 123456
	 * })
	 * ```
	 *
	 * @returns an array of event objects
	 *
	 * @publicApi
	 */
	async findMany(options: ScheduleOptions): Promise<Response> {
		const { type, id, timeFrom, timeTo } = options

		const now = new Date()
		const defaultTimeFrom = timeFrom || new Date(now.getFullYear() - 2, 6, 1)
		const defaultTimeTo = timeTo || new Date(now.getFullYear() + 2, 8, 1)

		const time_from = Math.floor(defaultTimeFrom.getTime() / 1000)
		const time_to = Math.floor(defaultTimeTo.getTime() / 1000)

		const endpoint = `/ias/app/tt/P_API_EVEN_JSON?type_id=${type}&timetable_id=${id}&time_from=${time_from}&time_to=${time_to}&idClient=${this.clientId}`
		const rawJson = await this.fetcher.fetchAndDecode(endpoint)
		const result = this.parser.parseWithFallback<Response>(
			rawJson,
			`schedule_${type}_${id}`,
		)

		return fixEventTimestamps(result ?? [])
	}
}
