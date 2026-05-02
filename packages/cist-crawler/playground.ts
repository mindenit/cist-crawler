import { CistCrawler } from './src/index.js'

const crawler = new CistCrawler({ clientId: 'KEY_HERE' })

// Get schedule for a group
const groupSchedule = await crawler.getSchedule(
	1,
	11412614,
	new Date(1777248000 * 1000),
	new Date(1777507200 * 1000),
)
console.log(groupSchedule)
