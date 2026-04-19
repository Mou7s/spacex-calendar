import test from "node:test";
import assert from "node:assert/strict";

import worker from "../src/index.js";
import {
  buildCalendarFeed,
  escapeIcsText,
  loadLaunchData,
} from "../src/lib/spacex.js";

const sampleTiles = [
  {
    id: 1,
    correlationId: "ABC123",
    link: "starlink-1",
    title: "Starlink Mission",
    shortTitle: null,
    missionType: "starlink",
    vehicle: "Falcon 9",
    launchSite: "SLC-40, Florida",
    returnSite: "Droneship",
    callToAction: "WATCH",
    missionStatus: "upcoming",
    isLive: false,
    directToCell: false,
    returnDateTime: null,
    imageDesktop: { url: "https://example.com/image.jpg" },
  },
  {
    id: 2,
    correlationId: "DEF456",
    link: "gpsiii8",
    title: "GPS III-8 Mission",
    shortTitle: null,
    missionType: "nssl",
    vehicle: "Falcon 9",
    launchSite: "SLC-40, Florida",
    returnSite: "Droneship",
    callToAction: "WATCH",
    missionStatus: "upcoming",
    isLive: false,
    directToCell: false,
    returnDateTime: null,
    imageDesktop: { url: "https://example.com/gps.jpg" },
  },
];

const sampleTimings = {
  ABC123: {
    CorrelationId: "ABC123",
    PrimaryLaunchDate: { Seconds: 1776520800, Nanos: 0 },
    PrimaryLaunchWindow: null,
    TZeroLaunchDate: null,
    IsPrimaryLaunchTimeGiven: false,
  },
  DEF456: {
    CorrelationId: "DEF456",
    PrimaryLaunchDate: { Seconds: 1776667680, Nanos: 0 },
    PrimaryLaunchWindow: {
      Open: { Seconds: 1776667680, Nanos: 0 },
      Close: { Seconds: 1776669720, Nanos: 0 },
    },
    TZeroLaunchDate: null,
    IsPrimaryLaunchTimeGiven: false,
  },
};

function createFetchStub() {
  return async (url) => {
    if (String(url).includes("launches-page-tiles/upcoming")) {
      return new Response(JSON.stringify(sampleTiles), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (String(url).includes("future_missions.json")) {
      return new Response(JSON.stringify(sampleTimings), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };
}

test("loadLaunchData merges SpaceX tiles and timing feeds", async () => {
  const data = await loadLaunchData(createFetchStub());

  assert.equal(data.missions.length, 2);
  assert.equal(data.nextLaunch.title, "Starlink Mission");
  assert.equal(data.missions[0].missionUrl, "https://www.spacex.com/launches/starlink-1/");
  assert.equal(data.missions[1].launchWindow.close, "2026-04-20T07:22:00.000Z");
});

test("buildCalendarFeed emits valid VEVENT entries with DTEND when available", async () => {
  const data = await loadLaunchData(createFetchStub());
  const calendar = buildCalendarFeed(data);

  assert.match(calendar, /BEGIN:VCALENDAR/);
  assert.match(calendar, /END:VCALENDAR/);
  assert.match(calendar, /BEGIN:VEVENT/g);
  assert.match(calendar, /UID:ABC123@spacexcalendar\.local/);
  assert.match(calendar, /LAST-MODIFIED:\d{8}T\d{6}Z/);
  assert.match(calendar, /SEQUENCE:\d+/);
  assert.match(calendar, /DTEND:20260420T072200Z/);
});

test("escapeIcsText escapes newlines commas and semicolons", () => {
  assert.equal(
    escapeIcsText("Line 1\nA,B;C"),
    "Line 1\\nA\\,B\\;C"
  );
});

test("worker serves calendar route with text/calendar", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createFetchStub();

  try {
    const response = await worker.fetch(
      new Request("https://calendar.example.com/spacex.ics"),
      { ASSETS: { fetch: () => new Response("not used") } }
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
    assert.match(await response.text(), /BEGIN:VCALENDAR/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker falls back to static assets for root route", async () => {
  const response = await worker.fetch(new Request("https://calendar.example.com/"), {
    ASSETS: {
      fetch: () =>
        new Response("<html>ok</html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<html>ok</html>");
});
