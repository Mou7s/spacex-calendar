# SpaceX Calendar

A Cloudflare Worker that turns the live upcoming SpaceX launch feed into a public ICS calendar you can subscribe to from iCloud / Apple Calendar.

## What It Does

- Publishes an ICS feed at `/spacex.ics`
- Exposes normalized launch data at `/api/launches`
- Serves a lightweight landing page with subscription instructions
- Pulls data from the current SpaceX website feeds instead of the stale public v4 launch API
- Auto-localizes the landing page based on browser language

## Live Usage

Once deployed to Cloudflare and bound to a custom domain, your subscription URL will look like:

```text
https://spacex-calendar.mou7s.com/spacex.ics
```

Apple Calendar can also subscribe with:

```text
webcal://spacex-calendar.mou7s.com/spacex.ics
```

## Data Sources

This project currently uses the same live SpaceX content sources used by the SpaceX website:

- `https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming`
- `https://sxcontent9668.azureedge.us/cms-assets/future_missions.json`

## Project Structure

```text
src/
  index.js           Worker entrypoint and route handling
  lib/spacex.js      SpaceX data normalization and ICS generation
public/
  index.html         Landing page
  app.js             Frontend logic and i18n
  styles.css         Landing page styles
test/
  spacex.test.js     Feed generation and route tests
wrangler.toml        Cloudflare Worker config
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the Worker locally:

```bash
npm run dev
```

The local dev server is usually available at:

```text
http://localhost:8787
```

Useful routes:

- `/`
- `/spacex.ics`
- `/api/launches`

## Testing

Run the automated tests:

```bash
npm test
```

Current test coverage includes:

- merging the two SpaceX data feeds
- ICS generation with valid `VEVENT` output
- escaping calendar text correctly
- Worker route behavior for `/spacex.ics`
- static asset fallback for `/`

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Then bind your Worker to a custom domain in Cloudflare, for example:

- `spacex-calendar.mou7s.com`

After domain binding, verify:

```bash
curl -I https://spacex-calendar.mou7s.com/spacex.ics
```

You should see:

- `200 OK`
- `Content-Type: text/calendar; charset=utf-8`

## Notes

- This project currently only includes upcoming launches
- It does not include historical launches
- It does not require a database or login
- The landing page language is auto-detected from the browser
