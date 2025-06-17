import type { Response, ScheduleOptions } from '@/types.js'

export interface IScheduleModule {
	findMany: (options: ScheduleOptions) => Promise<Response>
}
