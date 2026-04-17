# AGENTS

## Project Overview

This repository contains a Cloudflare Worker that generates a public ICS feed for upcoming SpaceX launches and serves a small landing page for calendar subscription.

## Key Architecture

- `src/index.js` handles Worker routes:
  - `/spacex.ics`
  - `/calendar.ics`
  - `/api/launches`
  - static asset fallback through the Cloudflare `ASSETS` binding
- `src/lib/spacex.js` contains the shared launch-feed logic:
  - upstream data fetching
  - normalization
  - month summary generation
  - ICS serialization
- `public/app.js` handles client-side rendering and automatic i18n

## Working Rules

- Keep the ICS feed stable:
  - do not change `UID` generation unless there is a clear migration reason
  - preserve `text/calendar` response behavior for `/spacex.ics`
- Prefer lightweight changes:
  - this project does not need a framework
  - keep the landing page static and dependency-light
- Preserve current data sources unless SpaceX changes them
- Prefer browser-native APIs over adding libraries
- When editing frontend copy, update both Chinese and English translations together

## Validation

Before finishing code changes, run:

```bash
npm test
```

When touching the frontend logic, also check:

```bash
node --check public/app.js
```

When touching Worker logic, also check:

```bash
node --check src/index.js
node --check src/lib/spacex.js
```

## Deployment Notes

- Local dev uses `wrangler dev`
- Production deploy uses `wrangler deploy`
- The expected public domain shape is a subdomain such as `spacex-calendar.mou7s.com`
