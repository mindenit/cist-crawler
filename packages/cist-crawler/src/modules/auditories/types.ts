import type { Response } from '@/types.js'

export interface IAuditoriesModule {
	findMany: () => Promise<Response>
}
