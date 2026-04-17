# SpaceX Calendar Worker

A Cloudflare Worker that publishes an online ICS feed for upcoming SpaceX launches, suitable for subscribing from iCloud / Apple Calendar.

## Features

- Live SpaceX launch data from the current SpaceX website feeds
- ICS endpoint at `/spacex.ics`
- JSON endpoint at `/api/launches`
- Static landing page with subscription instructions
- Cloudflare Worker deployment with static assets

## Local Development

Install dependencies:

```bash
npm install
```

Start the local Worker dev server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

## Deploy

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

After binding a custom domain such as `spacex-calendar.mou7s.com`, the main subscription URL will be:

```text
https://spacex-calendar.mou7s.com/spacex.ics
```

For Apple Calendar, you can also use:

```text
webcal://spacex-calendar.mou7s.com/spacex.ics
```

## Project Structure

- `src/index.js`: Worker entrypoint and route handling
- `src/lib/spacex.js`: SpaceX data loading and ICS generation
- `public/`: static landing page assets
- `test/spacex.test.js`: tests for feed generation and routing
