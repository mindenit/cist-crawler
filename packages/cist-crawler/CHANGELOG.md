# Changelog

All notable changes to this package are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

Pending in local branches, not yet merged to `main` or published.

- Server-resolution caching (60s TTL) to avoid re-probing before every fetch
- Retry with backoff on transient fetch failures, skipping deterministic 4xx errors
- Per-server circuit breaker (3 failures → 30s cooldown)
- Opt-in `requestDelayMs` to pace outbound requests
- Classification of Oracle backend errors (`ORA-\d+`) as a distinct `CistCrawlerError` (502) instead of a generic parse failure
- Constructor validation for empty `servers` / non-positive `timeout`
- CI workflow (typecheck, build, format check)

## [0.1.4] - 2026-05-03

- Add CJS build output, remove hashing for `.d.ts` files

## [0.1.2] - 2026-03-31

- Bump `tsdown`, `tsx`, `typescript` dependencies
- Fix event timestamps

> `0.1.3` was published to npm around the same time as `0.1.2`/`0.1.4` but
> has no corresponding commit in git history — likely a rapid republish, not
> a distinct code change.

## [0.1.1] - 2025-06-20

Initial public release.

- Groups, teachers, auditories, and schedule crawling modules
- Full TypeScript type definitions
- Automatic server failover
- Robust JSON parsing with automatic error correction
- README, CONTRIBUTING, CODE_OF_CONDUCT
- ESM + CJS build via tsdown
