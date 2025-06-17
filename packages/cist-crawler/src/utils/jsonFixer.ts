export class UniversalJSONFixer {
	private fixes = [
		{ name: 'BOM and invisible characters', fn: this.removeBOM },
		{ name: 'Extra spaces', fn: this.cleanWhitespace },
		{ name: 'Extra closing braces', fn: this.fixExtraClosingBraces },
		{ name: 'Multiple braces', fn: this.fixMultipleBraces },
		{ name: 'Incorrect sequences', fn: this.fixBraceSequences },
		{ name: 'Balance braces', fn: this.balanceBraces },
		{ name: 'Trailing commas', fn: this.fixTrailingCommas },
		{ name: 'Missing commas', fn: this.fixMissingCommas },
		{ name: 'Key quotes', fn: this.fixUnquotedKeys },
		{ name: 'Single quotes', fn: this.fixSingleQuotes },
		{ name: 'Unclosed strings', fn: this.fixUnclosedStrings },
		{ name: 'Empty values', fn: this.fixEmptyValues },
		{ name: 'Incorrect values', fn: this.fixValues },
		{ name: 'Comments', fn: this.removeComments },
		{ name: 'Final cleanup', fn: this.finalCleanup },
	]

	private removeBOM(str: string): string {
		return str.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '')
	}

	private cleanWhitespace(str: string): string {
		return str.replace(/[\t\r]/g, ' ').replace(/\n+/g, '\n')
	}

	private fixExtraClosingBraces(str: string): string {
		str = str.replace(/(\[\s*\])\s*[\]\}]+/g, '$1')
		str = str.replace(/(\{\s*\})\s*[\]\}]+/g, '$1')
		str = str.replace(/\[\s*\]\s*\]\s*\]\s*(?=[,\]\}])/g, '[]')
		str = str.replace(/\[\s*\]\s*\}\s*\]\s*(?=[,\]\}])/g, '[]')
		return str
	}

	private fixMultipleBraces(str: string): string {
		str = str.replace(/\]{2,}/g, ']')
		str = str.replace(/\}{2,}/g, '}')
		str = str.replace(/[\]\}]{3,}/g, (match) => {
			const braceCount = (match.match(/\}/g) || []).length
			const bracketCount = (match.match(/\]/g) || []).length
			return (braceCount > 0 ? '}' : '') + (bracketCount > 0 ? ']' : '')
		})
		return str
	}

	private fixBraceSequences(str: string): string {
		str = str.replace(/\}\s*\]/g, '}')
		str = str.replace(/\]\s*\}/g, ']')
		str = str.replace(/\[\s*\}/g, '[')
		str = str.replace(/\{\s*\]/g, '{')
		return str
	}

	private balanceBraces(str: string): string {
		const openBraces = (str.match(/\{/g) || []).length
		const closeBraces = (str.match(/\}/g) || []).length
		const openBrackets = (str.match(/\[/g) || []).length
		const closeBrackets = (str.match(/\]/g) || []).length

		let result = str

		if (closeBraces > openBraces) {
			const extra = closeBraces - openBraces
			for (let i = 0; i < extra; i++) {
				result = result.replace(/\}(?![^{]*\{)/, '')
			}
		}

		if (closeBrackets > openBrackets) {
			const extra = closeBrackets - openBrackets
			for (let i = 0; i < extra; i++) {
				result = result.replace(/\](?![^\[]*\[)/, '')
			}
		}

		if (openBraces > closeBraces) {
			result += '}'.repeat(openBraces - closeBraces)
		}

		if (openBrackets > closeBrackets) {
			result += ']'.repeat(openBrackets - closeBrackets)
		}

		return result
	}

	private fixTrailingCommas(str: string): string {
		return str.replace(/,(\s*[\]\}])/g, '$1')
	}

	private fixMissingCommas(str: string): string {
		str = str.replace(/\}(\s*)\{/g, '},$1{')
		str = str.replace(/\](\s*)\[/g, '],$1[')
		str = str.replace(/"(\s*)"(?!\s*:)/g, '",$1"')
		str = str.replace(/(\d)(\s*)"/g, '$1,$2"')
		str = str.replace(/"(\s*)(\d)/g, '",$1$2')
		return str
	}

	private fixUnquotedKeys(str: string): string {
		return str.replace(/([{\s,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":')
	}

	private fixSingleQuotes(str: string): string {
		return str.replace(/'/g, '"')
	}

	private fixUnclosedStrings(str: string): string {
		const lines = str.split('\n')
		return lines
			.map((line) => {
				let quoteCount = 0
				let escaped = false

				for (let i = 0; i < line.length; i++) {
					if (line[i] === '"' && !escaped) {
						quoteCount++
					}
					escaped = line[i] === '\\' && !escaped
				}

				if (quoteCount % 2 === 1) {
					return line + '"'
				}
				return line
			})
			.join('\n')
	}

	private fixEmptyValues(str: string): string {
		return str.replace(/:(\s*?)([,}\]])/g, ':null$2')
	}

	private fixValues(str: string): string {
		str = str.replace(/:\s*undefined\b/g, ': null')
		str = str.replace(/:\s*True\b/g, ': true')
		str = str.replace(/:\s*False\b/g, ': false')
		str = str.replace(/:\s*None\b/g, ': null')
		return str
	}

	private removeComments(str: string): string {
		str = str.replace(/\/\/.*$/gm, '')
		str = str.replace(/\/\*[\s\S]*?\*\//g, '')
		str = str.replace(/#.*$/gm, '')
		return str
	}

	private finalCleanup(str: string): string {
		str = str.replace(/\n\s*\n/g, '\n')
		str = str.replace(/,\s*,/g, ',')
		str = str.replace(/:\s*,/g, ': null,')
		str = str.replace(/[\r\n]/g, '')
		return str.trim()
	}

	fix(content: string): {
		success: boolean
		fixed: string
		appliedFixes: string[]
	} {
		if (!content) return { success: true, fixed: '{}', appliedFixes: [] }

		let working = content
		const appliedFixes: string[] = []

		for (const fix of this.fixes) {
			try {
				const before = working
				working = fix.fn.call(this, working)

				if (working !== before) {
					appliedFixes.push(fix.name)
				}

				try {
					JSON.parse(working)
					return { success: true, fixed: working, appliedFixes }
				} catch (e) {
					continue
				}
			} catch (error) {
				continue
			}
		}

		return { success: false, fixed: working, appliedFixes }
	}
}
