import type { Event, Response } from '@/types.js'

const PAIR_SCHEDULE: Record<number, { h: number; m: number }> = {
	1: { h: 7, m: 45 },
	2: { h: 9, m: 30 },
	3: { h: 11, m: 15 },
	4: { h: 13, m: 10 },
	5: { h: 14, m: 55 },
	6: { h: 16, m: 40 },
}

function lastSundayOf(year: number, month: number): Date {
	const lastDay = new Date(Date.UTC(year, month, 0))
	const dayOfWeek = lastDay.getUTCDay()
	lastDay.setUTCDate(lastDay.getUTCDate() - dayOfWeek)
	return lastDay
}

function kyivOffsetHours(kyivNaive: Date): number {
	const year = kyivNaive.getUTCFullYear()
	const dstStart = lastSundayOf(year, 3)
	dstStart.setUTCHours(3, 0, 0, 0)
	const dstEnd = lastSundayOf(year, 10)
	dstEnd.setUTCHours(4, 0, 0, 0)
	return kyivNaive >= dstStart && kyivNaive < dstEnd ? 3 : 2
}

/**
 * Fixes event start_time/end_time timestamps that CIST encodes with a fixed
 * UTC+2 offset regardless of DST. Uses number_pair as the source of truth for
 * the correct Kyiv local start time, then recalculates the proper UTC timestamp.
 *
 * All pairs run 07:45-18:15 Kyiv = 04:45-16:15 UTC, so the UTC date always
 * matches the Kyiv local date and can be used safely without conversion.
 */
export function fixEventTimestamps(response: Response): Response {
	if (!response.events?.length) return response

	const events = response.events as Event[]
	const processed = new Set<number>()

	for (const event of events) {
		const sched = PAIR_SCHEDULE[event.number_pair]
		if (sched === undefined) continue

		const oldStart = event.start_time
		if (processed.has(oldStart)) continue
		processed.add(oldStart)

		const utcDate = new Date(oldStart * 1000)
		const year = utcDate.getUTCFullYear()
		const month = utcDate.getUTCMonth()
		const day = utcDate.getUTCDate()

		const kyivNaive = new Date(
			Date.UTC(year, month, day, sched.h, sched.m, 0, 0),
		)
		const offset = kyivOffsetHours(kyivNaive)
		const correctStart = Math.floor(kyivNaive.getTime() / 1000) - offset * 3600

		if (correctStart === oldStart) continue

		const shift = correctStart - oldStart

		for (const ev of events) {
			if (ev.start_time === oldStart) {
				ev.start_time = correctStart
				ev.end_time = ev.end_time + shift
			}
		}
	}

	return response
}
