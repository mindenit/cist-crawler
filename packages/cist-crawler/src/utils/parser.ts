import { UniversalJSONFixer } from '@/utils/jsonFixer.js'
import { CistCrawlerError } from '@/error.js'

// Cist backend is Oracle-backed; on internal failure it returns an
// "ORA-XXXXX: ..." plain-text body with HTTP 200 instead of real JSON.
const KNOWN_ORA_MESSAGES: Record<string, string> = {
	'ORA-04030': 'Out of process memory',
	'ORA-01089': 'Immediate shutdown in progress, no operations permitted',
	'ORA-01652': 'Unable to extend temp segment',
	'ORA-08103': 'Object no longer exists',
}

export class JSONParser {
	private tryFixComplex(invalidJson: string): string {
		if (!invalidJson) return '{}'

		const fixJsonString = (str: string) =>
			str.replace(/\\"/g, '"').replace(/"/g, '\\"')
		const fixNonStringJson = (str: string) => {
			let result = str.replace(/[\r\n\t]/g, ' ')
			result = result.replace(/:(\s*?)([,}\]])/g, ':null$2')
			return result
		}

		const stringStart = '":"'
		const stringEndTokens = ['",', '"}', '"]', '","']
		let resultParts: string[] = []
		let currentIndex = 0

		let firstValueIndex = invalidJson.indexOf(stringStart)
		if (firstValueIndex === -1) {
			return fixNonStringJson(invalidJson)
		}

		resultParts.push(
			fixNonStringJson(invalidJson.substring(0, firstValueIndex)),
		)
		currentIndex = firstValueIndex

		while (currentIndex < invalidJson.length && currentIndex !== -1) {
			let currentStringStartIndex = invalidJson.indexOf(
				stringStart,
				currentIndex,
			)
			if (currentStringStartIndex === -1) {
				resultParts.push(fixNonStringJson(invalidJson.substring(currentIndex)))
				break
			}

			if (currentStringStartIndex > currentIndex) {
				resultParts.push(
					fixNonStringJson(
						invalidJson.substring(currentIndex, currentStringStartIndex),
					),
				)
			}

			resultParts.push(stringStart)

			let valueContentStartIndex = currentStringStartIndex + stringStart.length
			let nextEndIndex = -1

			for (const token of stringEndTokens) {
				const index = invalidJson.indexOf(token, valueContentStartIndex)
				if (index !== -1 && (nextEndIndex === -1 || index < nextEndIndex)) {
					nextEndIndex = index
				}
			}

			if (nextEndIndex === -1) {
				const restOfString = invalidJson.substring(valueContentStartIndex)
				resultParts.push(fixJsonString(restOfString))
				currentIndex = -1
				continue
			}

			const valueContent = invalidJson.substring(
				valueContentStartIndex,
				nextEndIndex,
			)
			resultParts.push(fixJsonString(valueContent))
			currentIndex = nextEndIndex
		}

		return resultParts.join('')
	}

	private tryFixSimple(invalidJson: string): string {
		if (!invalidJson) return '{}'

		const fixResult = UniversalJSONFixer.fix(invalidJson)
		if (fixResult.success) {
			return fixResult.fixed
		}

		let correctedJson = invalidJson
			.replace(/[\r\n]/g, '')
			.replace(/\\"(?=[,}\]])/g, '"')

		correctedJson = correctedJson.replace(/:(\s*?)([,}\]])/g, ':null$2')

		return correctedJson
	}

	parseWithFallback<T>(rawJson: string, requestType: string): T {
		try {
			const fixedJson = this.tryFixComplex(rawJson)
			return JSON.parse(fixedJson)
		} catch (primaryError) {
			try {
				const fixedJsonBackup = this.tryFixSimple(rawJson)
				return JSON.parse(fixedJsonBackup)
			} catch (backupError) {
				const oraMatch = rawJson.match(/ORA-\d+/)
				if (oraMatch) {
					const code = oraMatch[0]
					const description =
						KNOWN_ORA_MESSAGES[code] ?? 'Unknown Oracle exception'
					throw new CistCrawlerError(
						`Cist returned an Oracle exception for '${requestType}': ${description} (${code})`,
						502,
						code,
					)
				}

				throw new CistCrawlerError(
					`Failed to parse JSON for '${requestType}': ${primaryError instanceof Error ? primaryError.message : 'Unknown error'}`,
					400,
				)
			}
		}
	}
}
