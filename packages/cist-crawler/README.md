# CIST Crawler

A TypeScript library for crawling schedule data from NURE (National University of Radio Electronics) CIST system.

## Features

- 🏫 Fetch groups, teachers, auditories, and schedules
- 🔄 Automatic server failover with a per-server circuit breaker
- ♻️ Automatic retry with backoff on transient failures
- 🛠️ Robust JSON parsing with automatic error correction, including Oracle backend error classification
- 📝 Full TypeScript support with comprehensive type definitions
- ⚡ Modern ES modules with tree-shaking support
- 🔧 Configurable timeout, server settings, and opt-in request pacing

## Installation

```bash
# npm
npm install @mindenit/cist-crawler

# yarn
yarn add @mindenit/cist-crawler

# pnpm
pnpm add @mindenit/cist-crawler
```

## Quick Start

```typescript
import { CistCrawler } from '@mindenit/cist-crawler'

const crawler = new CistCrawler({ clientId: 'your_client_id' })

// Get all groups
const groups = await crawler.getGroups()
console.log(groups)

// Get all teachers
const teachers = await crawler.getTeachers()
console.log(teachers)

// Get all auditories
const auditories = await crawler.getAuditories()
console.log(auditories)

// Get schedule for a group
const groupSchedule = await crawler.getSchedule(1, 3547345)
console.log(groupSchedule)
```

## Configuration

You can configure the crawler with custom servers, timeout, and client ID settings:

```typescript
import { CistCrawler } from '@mindenit/cist-crawler'

const crawler = new CistCrawler({
	servers: ['cist.nure.ua', 'cist2.nure.ua'], // Custom server list
	timeout: 10000, // 10 second timeout
	clientId: 'your_client_id', // CIST API client identifier
	requestDelayMs: 8000, // Optional: minimum delay between requests
})
```

> **Note:** The `clientId` is required to access the schedule endpoint. If not provided, it defaults to `'KEY_NOT_PROVIDED'` and schedule requests will fail with an authorization error.

## API Reference

### Constructor

```typescript
new CistCrawler(config?: CistCrawlerConfig)
```

#### CistCrawlerConfig

| Property         | Type       | Default                             | Description                                                                 |
| ---------------- | ---------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `servers`        | `string[]` | `['cist.nure.ua', 'cist2.nure.ua']` | List of CIST servers to use                                                 |
| `timeout`        | `number`   | `5000`                              | Request timeout in milliseconds                                             |
| `clientId`       | `string`   | `'KEY_NOT_PROVIDED'`                | CIST API client identifier (required for schedule requests)                 |
| `requestDelayMs` | `number`   | `undefined` (no pacing)             | Opt-in minimum delay between outbound requests, useful to avoid rate limits |

### Methods

#### `getGroups()`

Retrieves all available groups from the CIST system.

```typescript
const groups = await crawler.getGroups()
```

**Returns:** `Promise<Response>` - Object containing groups array and university info

#### `getTeachers()`

Retrieves all available teachers from the CIST system.

```typescript
const teachers = await crawler.getTeachers()
```

**Returns:** `Promise<Response>` - Object containing teachers array and university info

#### `getAuditories()`

Retrieves all available auditories (classrooms) from the CIST system.

```typescript
const auditories = await crawler.getAuditories()
```

**Returns:** `Promise<Response>` - Object containing buildings and auditories info

#### `getSchedule(type, id, timeFrom?, timeTo?)`

Retrieves schedule for a specific group or teacher.

```typescript
// Get group schedule
const groupSchedule = await crawler.getSchedule(1, 3547345)

// Get teacher schedule
const teacherSchedule = await crawler.getSchedule(2, 123456)

// Get schedule for specific time period
const schedule = await crawler.getSchedule(
	1,
	3547345,
	new Date('2024-01-01'),
	new Date('2024-12-31'),
)
```

**Parameters:**

- `type`: `1 | 2` - Type of schedule (1 for group, 2 for teacher)
- `id`: `number` - ID of the group or teacher
- `timeFrom`: `Date` (optional) - Start date for schedule
- `timeTo`: `Date` (optional) - End date for schedule

**Returns:** `Promise<Response>` - Object containing events array and related info

## Type Definitions

The library includes comprehensive TypeScript definitions for all data structures:

### Core Types

```typescript
interface Group {
	id: number
	name: string
}

interface Teacher {
	id: number
	full_name: string
	short_name: string
}

interface Event {
	subject_id: number
	start_time: number
	end_time: number
	type: number
	number_pair: number
	auditory: string
	teachers: number[]
	groups: number[]
}

interface Response {
	university?: University
	'time-zone'?: string
	events?: Event[]
	groups?: Group[]
	teachers?: Teacher[]
	subjects?: Subject[]
	types?: Type[]
}
```

For complete type definitions, see the exported types from the package.

## Error Handling

The library includes custom error handling with the `CistCrawlerError` class:

```typescript
import { CistCrawler, CistCrawlerError } from '@mindenit/cist-crawler'

try {
	const crawler = new CistCrawler()
	const groups = await crawler.getGroups()
} catch (error) {
	if (error instanceof CistCrawlerError) {
		console.error(`CIST Error ${error.status}: ${error.message}`)
	} else {
		console.error('Unknown error:', error)
	}
}
```

## Server Failover & Resilience

The library automatically handles server failover. If the primary server is unavailable, it will try the next server in the list. This ensures high availability even when some CIST servers are down.

On top of failover:

- **Retry with backoff** — transient fetch failures (timeouts, network errors) are retried up to 3 times with linear backoff. Deterministic client errors (4xx) are not retried.
- **Per-server circuit breaker** — after 3 consecutive failures, a server is skipped for 30 seconds instead of being re-probed on every request.
- **Server health caching** — a resolved healthy server is cached for 60 seconds so repeated requests (e.g. crawling many groups in a loop) don't re-run a health check every time.
- **Opt-in request pacing** — set `requestDelayMs` if you need to stay under a minimum interval between requests to avoid rate limiting; unset by default, no pacing is imposed.

## JSON Parsing

The library includes robust JSON parsing that can handle malformed JSON responses from the CIST API. It automatically applies various fixes to ensure reliable data parsing.

The CIST backend is Oracle-based and occasionally returns an internal `ORA-XXXXX` error as plain text with an HTTP 200 status instead of real JSON. The parser detects this and throws a `CistCrawlerError` (status `502`) with the Oracle error code attached via `error.code`, instead of a generic parse-failure error.

## Examples

### Getting Group Schedule for Current Semester

```typescript
import { CistCrawler } from '@mindenit/cist-crawler'

const crawler = new CistCrawler({ clientId: 'your_client_id' })

async function getCurrentSemesterSchedule(groupId: number) {
	const now = new Date()
	const semesterStart = new Date(
		now.getFullYear(),
		now.getMonth() < 7 ? 1 : 8,
		1,
	)
	const semesterEnd = new Date(
		now.getFullYear(),
		now.getMonth() < 7 ? 6 : 12,
		31,
	)

	const schedule = await crawler.getSchedule(
		1,
		groupId,
		semesterStart,
		semesterEnd,
	)
	return schedule
}

// Usage
const schedule = await getCurrentSemesterSchedule(3547345)
console.log(schedule.events)
```

## Requirements

- Node.js >= 22.x
- TypeScript support (optional but recommended)

## License

[GPL-3.0-only](LICENSE)

## Authors

- [Kyrylo Savieliev](https://github.com/OneLiL05)
- [Roman Trashutin](https://github.com/perkinson1251)

## Contributing

This project is part of the Mindenit ecosystem. For more information on contributing, please see the [Contributing Guide](CONTRIBUTING)
