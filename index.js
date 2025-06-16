import fetch from 'node-fetch';
import iconv from 'iconv-lite';
import fs from 'fs/promises';

const SERVERS = ["cist.nure.ua", "cist2.nure.ua"];

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