import { CistCrawler } from './src/index.js'

const crawler = new CistCrawler()
const data = await crawler.getGroups()
console.log(data)
