import { GroupsModule } from '@/modules/groups/index.js'
import type { IGroupsModule } from '@/modules/groups/types.js'
import { TeachersModule } from '@/modules/teachers/index.js'
import type { ITeachersModule } from '@/modules/teachers/types.js'
import { AuditoriesModule } from '@/modules/auditories/index.js'
import type { IAuditoriesModule } from '@/modules/auditories/types.js'
import { ScheduleModule } from '@/modules/schedule/index.js'
import type { IScheduleModule } from '@/modules/schedule/types.js'
import type { CistCrawlerConfig } from '@/types.js'

export const DEFAULT_CONFIG = {
	servers: ['cist.nure.ua', 'cist2.nure.ua'],
	timeout: 5000,
} as const

export class CistCrawler {
	private groups: IGroupsModule
	private teachers: ITeachersModule
	private auditories: IAuditoriesModule
	private schedule: IScheduleModule

	constructor(config?: CistCrawlerConfig) {
		const servers = config?.servers ?? DEFAULT_CONFIG.servers
		const timeout = config?.timeout ?? DEFAULT_CONFIG.timeout

		const mutableServers = [...servers]

		this.groups = new GroupsModule(mutableServers, timeout)
		this.teachers = new TeachersModule(mutableServers, timeout)
		this.auditories = new AuditoriesModule(mutableServers, timeout)
		this.schedule = new ScheduleModule(mutableServers, timeout)
	}

	async getGroups() {
		return this.groups.findMany()
	}

	async getTeachers() {
		return this.teachers.findMany()
	}

	async getAuditories() {
		return this.auditories.findMany()
	}

	async getSchedule(type: 1 | 2, id: number, timeFrom?: Date, timeTo?: Date) {
		return this.schedule.findMany({ type, id, timeFrom, timeTo })
	}
}

export type {
	AuditoryElement,
	AuditoryType,
	Building,
	Department,
	Direction,
	Event,
	Faculty,
	Group,
	Hour,
	Subject,
	Teacher,
	Type,
	Response,
	University,
	ScheduleOptions,
	CistCrawlerConfig,
} from './types.js'

export { CistCrawlerError } from './error.js'

export default CistCrawler
