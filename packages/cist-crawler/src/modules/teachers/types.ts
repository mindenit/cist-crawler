import type { Response } from '@/types.js'

export interface ITeachersModule {
	findMany: () => Promise<Response>
}
