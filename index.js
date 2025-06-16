// I hate my life...
import fetch from 'node-fetch';
import iconv from 'iconv-lite';
import fs from 'fs/promises';

const SERVERS = ["cist.nure.ua", "cist2.nure.ua"];

class UniversalJSONFixer {
    constructor() {
        this.fixes = [
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
            
            { name: 'Final cleanup', fn: this.finalCleanup }
        ];
    }

    removeBOM(str) {
        return str.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
    }

    cleanWhitespace(str) {
        return str.replace(/[\t\r]/g, ' ').replace(/\n+/g, '\n');
    }

    fixExtraClosingBraces(str) {
        str = str.replace(/(\[\s*\])\s*[\]\}]+/g, '$1');
        str = str.replace(/(\{\s*\})\s*[\]\}]+/g, '$1');
        
        str = str.replace(/\[\s*\]\s*\]\s*\]\s*(?=[,\]\}])/g, '[]');
        str = str.replace(/\[\s*\]\s*\}\s*\]\s*(?=[,\]\}])/g, '[]');
        
        return str;
    }

    fixMultipleBraces(str) {
        str = str.replace(/\]{2,}/g, ']');
        str = str.replace(/\}{2,}/g, '}');
        str = str.replace(/[\]\}]{3,}/g, match => {
            const braceCount = (match.match(/\}/g) || []).length;
            const bracketCount = (match.match(/\]/g) || []).length;
            return (braceCount > 0 ? '}' : '') + (bracketCount > 0 ? ']' : '');
        });
        
        return str;
    }

    fixBraceSequences(str) {
        str = str.replace(/\}\s*\]/g, '}');
        str = str.replace(/\]\s*\}/g, ']');
        str = str.replace(/\[\s*\}/g, '[');
        str = str.replace(/\{\s*\]/g, '{');
        
        return str;
    }

    balanceBraces(str) {
        const openBraces = (str.match(/\{/g) || []).length;
        const closeBraces = (str.match(/\}/g) || []).length;
        const openBrackets = (str.match(/\[/g) || []).length;
        const closeBrackets = (str.match(/\]/g) || []).length;

        let result = str;

        if (closeBraces > openBraces) {
            const extra = closeBraces - openBraces;
            for (let i = 0; i < extra; i++) {
                result = result.replace(/\}(?![^{]*\{)/, '');
            }
        }

        if (closeBrackets > openBrackets) {
            const extra = closeBrackets - openBrackets;
            for (let i = 0; i < extra; i++) {
                result = result.replace(/\](?![^\[]*\[)/, '');
            }
        }

        if (openBraces > closeBraces) {
            result += '}'.repeat(openBraces - closeBraces);
        }

        if (openBrackets > closeBrackets) {
            result += ']'.repeat(openBrackets - closeBrackets);
        }

        return result;
    }

    fixTrailingCommas(str) {
        return str.replace(/,(\s*[\]\}])/g, '$1');
    }

    fixMissingCommas(str) {
        str = str.replace(/\}(\s*)\{/g, '},$1{');
        str = str.replace(/\](\s*)\[/g, '],$1[');
        str = str.replace(/"(\s*)"(?!\s*:)/g, '",$1"');
        str = str.replace(/(\d)(\s*)"/g, '$1,$2"');
        str = str.replace(/"(\s*)(\d)/g, '",$1$2');
        
        return str;
    }

    fixUnquotedKeys(str) {
        return str.replace(/([{\s,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g, '$1"$2":');
    }

    fixSingleQuotes(str) {
        return str.replace(/'/g, '"');
    }

    fixUnclosedStrings(str) {
        const lines = str.split('\n');
        return lines.map(line => {
            let quoteCount = 0;
            let escaped = false;

            for (let i = 0; i < line.length; i++) {
                if (line[i] === '"' && !escaped) {
                    quoteCount++;
                }
                escaped = line[i] === '\\' && !escaped;
            }

            if (quoteCount % 2 === 1) {
                return line + '"';
            }
            return line;
        }).join('\n');
    }

    fixEmptyValues(str) {
        return str.replace(/:(\s*?)([,}\]])/g, ':null$2');
    }

    fixValues(str) {
        str = str.replace(/:\s*undefined\b/g, ': null');
        str = str.replace(/:\s*True\b/g, ': true');
        str = str.replace(/:\s*False\b/g, ': false');
        str = str.replace(/:\s*None\b/g, ': null');
        
        return str;
    }

    removeComments(str) {
        str = str.replace(/\/\/.*$/gm, '');
        str = str.replace(/\/\*[\s\S]*?\*\//g, '');
        str = str.replace(/#.*$/gm, '');
        
        return str;
    }

    finalCleanup(str) {
        str = str.replace(/\n\s*\n/g, '\n');
        str = str.replace(/,\s*,/g, ',');
        str = str.replace(/:\s*,/g, ': null,');
        str = str.replace(/[\r\n]/g, '');
        
        return str.trim();
    }

    fix(content) {
        if (!content) return "{}";

        let working = content;
        const appliedFixes = [];

        for (const fix of this.fixes) {
            try {
                const before = working;
                working = fix.fn.call(this, working);

                if (working !== before) {
                    appliedFixes.push(fix.name);
                }

                try {
                    JSON.parse(working);
                    return { success: true, fixed: working, appliedFixes };
                } catch (e) {
                    continue;
                }
            } catch (error) {
                continue;
            }
        }

        return { success: false, fixed: working, appliedFixes };
    }
}

const jsonFixer = new UniversalJSONFixer();

async function getAvailableServer() {
    for (const server of SERVERS) {
        try {
            const healthCheckUrl = `https://${server}/ias/app/tt/P_API_AUDITORIES_JSON`;
            const response = await fetch(healthCheckUrl, { method: 'GET', timeout: 5000 });
            if (response.ok) {
                console.log(`Using server: ${server}`);
                return server;
            }
        } catch (error) {
            console.warn(`Server ${server} is unavailable. Error: ${error.message}`);
        }
    }
    return null;
}

async function fetchAndDecode(endpoint) {
    const server = await getAvailableServer();
    if (!server) {
        throw new Error("No available servers.");
    }
    const url = `https://${server}${endpoint}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        const decodedBody = iconv.decode(Buffer.from(buffer), 'windows-1251');
        
        return decodedBody.startsWith('\uFEFF') ? decodedBody.substring(1) : decodedBody;
    } catch (error) {
        console.error(`Failed to fetch data from ${url}:`, error);
        return "";
    }
}

function tryFixComplex(invalidJson) {
    if (!invalidJson) return "{}";

    const fixJsonString = (str) => str.replace(/\\"/g, '"').replace(/"/g, '\\"');
    const fixNonStringJson = (str) => {
        let result = str.replace(/[\r\n\t]/g, " ");
        result = result.replace(/:(\s*?)([,}\]])/g, ":null$2");
        return result;
    };

    const stringStart = '":"';
    const stringEndTokens = ['",', '"}', '"]', '","'];
    let resultParts = [];
    let currentIndex = 0;

    let firstValueIndex = invalidJson.indexOf(stringStart);
    if (firstValueIndex === -1) {
        return fixNonStringJson(invalidJson);
    }

    resultParts.push(fixNonStringJson(invalidJson.substring(0, firstValueIndex)));
    currentIndex = firstValueIndex;

    while (currentIndex < invalidJson.length && currentIndex !== -1) {
        let currentStringStartIndex = invalidJson.indexOf(stringStart, currentIndex);
        if (currentStringStartIndex === -1) {
            resultParts.push(fixNonStringJson(invalidJson.substring(currentIndex)));
            break; 
        }
        
        if (currentStringStartIndex > currentIndex) {
             resultParts.push(fixNonStringJson(invalidJson.substring(currentIndex, currentStringStartIndex)));
        }
        
        resultParts.push(stringStart);
        
        let valueContentStartIndex = currentStringStartIndex + stringStart.length;
        let nextEndIndex = -1;

        for (const token of stringEndTokens) {
            const index = invalidJson.indexOf(token, valueContentStartIndex);
            if (index !== -1 && (nextEndIndex === -1 || index < nextEndIndex)) {
                nextEndIndex = index;
            }
        }
        
        if (nextEndIndex === -1) {
             const restOfString = invalidJson.substring(valueContentStartIndex);
             resultParts.push(fixJsonString(restOfString));
             currentIndex = -1;
             continue;
        }
        
        const valueContent = invalidJson.substring(valueContentStartIndex, nextEndIndex);
        resultParts.push(fixJsonString(valueContent));
        currentIndex = nextEndIndex;
    }

    return resultParts.join('');
}

function tryFixSimple(invalidJson) {
    if (!invalidJson) return "{}";

    const fixResult = jsonFixer.fix(invalidJson);
    if (fixResult.success) {
        console.log(`Universal fixer applied: ${fixResult.appliedFixes.join(', ')}`);
        return fixResult.fixed;
    }

    let correctedJson = invalidJson
        .replace(/[\r\n]/g, '')
        .replace(/\\"(?=[,}\]])/g, '"');

    correctedJson = correctedJson.replace(/:(\s*?)([,}\]])/g, ":null$2");

    return correctedJson;
}

async function saveToFile(requestType, data) {
    const timestamp = Math.floor(Date.now() / 1000);
    const filename = `${requestType}_${timestamp}.json`;
    const content = JSON.stringify(data, null, 2);

    try {
        await fs.writeFile(filename, content, 'utf8');
        console.log(`\nData successfully saved to file: ${filename}`);
    } catch (error) {
        console.error(`\nError saving file:`, error);
    }
}

async function saveErrorFile(requestType, data) {
    const timestamp = Math.floor(Date.now() / 1000);
    const filename = `error_${requestType}_${timestamp}.json`;
    
    try {
        await fs.writeFile(filename, data, 'utf8');
        console.log(`Debug file saved: ${filename}`);
    } catch (writeError) {
        console.error(`\nFailed to write debug file:`, writeError);
    }
}

async function parseWithFallback(rawJson, requestType) {
    try {
        const fixedJson = tryFixComplex(rawJson);
        return JSON.parse(fixedJson);
    } catch (primaryError) {
        console.warn(`\nPrimary fix algorithm failed for '${requestType}'. Trying fallback...`);
        
        try {
            const fixedJsonBackup = tryFixSimple(rawJson);
            const result = JSON.parse(fixedJsonBackup);
            console.log(`Fallback algorithm successfully fixed JSON for '${requestType}'.`);
            return result;
        } catch (backupError) {
            console.error(`\nFallback algorithm also failed for '${requestType}'.`);
            await saveErrorFile(requestType, rawJson); 
            throw primaryError; 
        }
    }
}

async function getAuditories() {
    const rawJson = await fetchAndDecode("/ias/app/tt/P_API_AUDITORIES_JSON");
    return parseWithFallback(rawJson, 'auditories');
}

async function getGroups() {
    const rawJson = await fetchAndDecode("/ias/app/tt/P_API_GROUP_JSON");
    return parseWithFallback(rawJson, 'groups');
}

async function getTeachers() {
    let rawJson = await fetchAndDecode("/ias/app/tt/P_API_PODR_JSON");
    if (rawJson) {
        rawJson = rawJson.slice(0, -2) + "]}}";
    }
    return parseWithFallback(rawJson, 'teachers');
}

async function getEvents(type, id) {
    const now = new Date();
    const time_from = Math.floor(new Date(now.getFullYear() - 2, 6, 1).getTime() / 1000);
    const time_to = Math.floor(new Date(now.getFullYear() + 2, 8, 1).getTime() / 1000);
    
    const endpoint = `/ias/app/tt/P_API_EVEN_JSON?type_id=${type}&timetable_id=${id}&time_from=${time_from}&time_to=${time_to}&idClient=KNURESked`;
    const rawJson = await fetchAndDecode(endpoint);
    return parseWithFallback(rawJson, `schedule_${type}_${id}`);
}

function printUsage() {
    console.log(`
Usage: node index.js <command> [arguments]

Commands:
  groups              Get list of all groups
  teachers            Get list of all teachers
  auditories          Get list of all auditories
  schedule <type> <id> Get schedule
                      - type: 1 for group, 2 for teacher
                      - id: Object ID (e.g., 3547345)

Examples:
  node index.js groups
  node index.js schedule 1 3547345
    `);
}

async function main() {
    const command = process.argv[2];

    if (!command) {
        printUsage();
        return;
    }

    try {
        switch (command) {
            case 'groups':
                console.log("\n--- Getting list of groups ---");
                const groups = await getGroups();
                await saveToFile(command, groups);
                break;

            case 'teachers':
                console.log("\n--- Getting list of teachers ---");
                const teachers = await getTeachers();
                await saveToFile(command, teachers);
                break;

            case 'auditories':
                console.log("\n--- Getting list of auditories ---");
                const auditories = await getAuditories();
                await saveToFile(command, auditories);
                break;
            
            case 'schedule':
                const type = parseInt(process.argv[3], 10);
                const id = parseInt(process.argv[4], 10);

                if (isNaN(type) || isNaN(id)) {
                    console.error("\nError: 'schedule' command requires 'type' and 'id' parameters.");
                    printUsage();
                    return;
                }
                
                console.log(`\n--- Getting schedule for type=${type}, id=${id} ---`);
                const events = await getEvents(type, id);
                const filename = `${command}_${type}_${id}`;
                await saveToFile(filename, events);
                break;

            default:
                console.error(`\nUnknown command: "${command}"`);
                printUsage();
        }
    } catch (error) {
        console.error("\nCritical error occurred:", error.message);
    }
}

main();