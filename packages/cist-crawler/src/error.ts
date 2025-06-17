export class CistCrawlerError extends Error {
	status: number

	constructor(message: string = 'Something went wrong', status: number = 500) {
		super(`CistCrawlerError: ${status} ${message}`)

		this.name = 'CistCrawlerError'
		this.message = message
		this.status = status
	}
}
