export interface Types {
	university?: University
	'time-zone'?: string
	events?: Event[]
	groups?: Group[]
	teachers?: Teacher[]
	subjects?: Subject[]
	types?: Type[]
}

export interface Event {
	subject_id: number
	start_time: number
	end_time: number
	type: number
	number_pair: number
	auditory: string
	teachers: number[]
	groups: number[]
}

export interface Group {
	id: number
	name: string
}

export interface Subject {
	id: number
	brief: string
	title: string
	hours: Hour[]
}

export interface Hour {
	type: number
	val: number
	teachers: number[]
}

export interface Teacher {
	id: number
	full_name: string
	short_name: string
}

export interface Type {
	id: number
	short_name: string
	full_name: string
	id_base: number
	type: string
}

export interface University {
	short_name: string
	full_name: string
	buildings?: Building[]
	faculties?: Faculty[]
}

export interface Building {
	id: string
	short_name: string
	full_name: string
	auditories: AuditoryElement[]
}

export interface AuditoryElement {
	id: string
	short_name: string
	floor: string
	is_have_power: string
	auditory_types: AuditoryType[]
}

export interface AuditoryType {
	id: string
	short_name: string
}

export interface Faculty {
	id: number
	short_name: string
	full_name: string
	directions?: Direction[]
	departments?: Department[]
}

export interface Department {
	id: number
	short_name: string
	full_name: string
	teachers?: Department[]
	departments?: Department[]
}

export interface Direction {
	id: number
	short_name: string
	full_name: string
	specialities?: Direction[]
	groups?: Group[]
}
