export class CistCrawlerError extends Error {
	status: number
	code?: string

	constructor(
		message: string = 'Something went wrong',
		status: number = 500,
		code?: string,
	) {
		super(`CistCrawlerError: ${status} ${message}`)

		this.name = 'CistCrawlerError'
		this.message = message
		this.status = status
		this.code = code
	}
}
