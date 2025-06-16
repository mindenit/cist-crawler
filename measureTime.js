async function detailedMeasure(url) {
    const start = performance.now();
    
    try {
        const response = await fetch(url);
        const responseReceived = performance.now();
        
        const body = await response.text();
        const bodyRead = performance.now();
        
        console.log(`URL: ${url}`);
        console.log(`Status: ${response.status}`);
        console.log(`Time to receive headers: ${(responseReceived - start).toFixed(2)} ms`);
        console.log(`Time to read body: ${(bodyRead - responseReceived).toFixed(2)} ms`);
        console.log(`Total time: ${(bodyRead - start).toFixed(2)} ms`);
        console.log(`Response size: ${body.length} characters`);
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

const url = 'http://localhost:3000/schedule/10887098';

console.log('\n=== DETAILED MEASUREMENT ===');
await detailedMeasure(url);