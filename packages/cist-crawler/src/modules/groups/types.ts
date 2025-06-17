import type { Response } from '@/types.js'

export interface IGroupsModule {
	findMany: () => Promise<Response>
}
