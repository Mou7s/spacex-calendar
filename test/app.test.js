import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

// 1. Setup DOM environment before importing app.js
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html lang="en">
    <body>
      <div id="hero"></div>
      <h1 id="hero-title"></h1>
      <p id="hero-description"></p>
      <strong id="next-window"></strong>
      <div id="countdown"></div>
      <a id="hero-mission-link"></a>
      <div id="month-strip"></div>
      <div id="tracker"></div>
      <section id="missions-grid" hidden></section>
      <p id="refresh-note"></p>
      <section id="history-grid" hidden></section>
      <p id="history-refresh-note"></p>
      <a id="calendar-link"></a>
      <code id="ics-url"></code>
      <code id="webcal-url"></code>
      <meta id="meta-description" content="" />
      <button class="calendar-nav-button" id="calendar-prev"></button>
      <button class="calendar-nav-button" id="calendar-next"></button>
      <strong id="calendar-month-label"></strong>
      <div id="calendar-grid"></div>
      <div id="calendar-events-list"></div>
      <section id="selected-mission-panel"></section>
      <button id="theme-toggle"></button>

      <template id="mission-card-template">
        <article class="mission-card">
          <div class="mission-image"></div>
          <div class="mission-content">
            <div class="mission-topline">
              <span class="mission-badge"></span>
              <span class="mission-type"></span>
            </div>
            <h3 class="mission-title"></h3>
            <p class="mission-window"></p>
            <dl class="mission-facts">
              <div><dt data-i18n="mission.vehicle">Vehicle</dt><dd class="vehicle"></dd></div>
              <div><dt data-i18n="mission.launchSite">Launch site</dt><dd class="launch-site"></dd></div>
              <div><dt data-i18n="mission.returnSite">Return site</dt><dd class="return-site"></dd></div>
            </dl>
            <div class="mission-details" hidden>
              <div class="mission-details-heading" data-i18n="mission.detailsHeading">Mission brief</div>
              <p class="mission-summary"></p>
              <div class="mission-timelines"></div>
              <div class="mission-actions"></div>
            </div>
          </div>
        </article>
      </template>
    </body>
  </html>
`, {
  url: "http://localhost/"
});

dom.window.matchMedia = () => ({ matches: false, addEventListener: () => {} });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
globalThis.matchMedia = dom.window.matchMedia;
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
};
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
globalThis.Image = class {
  set src(value) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }

  get src() {
    return this._src;
  }
};
globalThis.fetch = async (url) => {
  const pathname = new URL(String(url), "http://localhost").pathname;

  if (pathname.startsWith("/locales/")) {
    const locale = pathname.split("/").pop();
    const body = await readFile(new URL(`../public/locales/${locale}`, import.meta.url), "utf8");
    return new Response(body, {
      headers: { "content-type": "application/json" },
    });
  }

  if (pathname === "/api/history-launches") {
    return new Response(JSON.stringify({ refreshedAt: "2026-05-19T00:00:00.000Z", missions: [] }));
  }

  return new Response(JSON.stringify({ refreshedAt: "2026-05-19T00:00:00.000Z", missions: [] }));
};

// 2. Import app.js dynamically after environment is ready
const app = await import("../public/app.js");

test("titleCase formats text properly", () => {
  assert.equal(app.titleCase("hello_world"), "Hello World");
  assert.equal(app.titleCase("starlink-mission"), "Starlink Mission");
  assert.equal(app.titleCase(""), "Unspecified"); 
});

test("localizeStatus formats mission status", () => {
  assert.equal(app.localizeStatus("upcoming"), "Upcoming");
  assert.equal(app.localizeStatus(""), "Unspecified");
});

test("localizeHistoryStatus formats success states", () => {
  assert.equal(app.localizeHistoryStatus(true), "Success");
  assert.equal(app.localizeHistoryStatus(false), "Failure");
  assert.equal(app.localizeHistoryStatus(null), "Unknown");
});

test("resolveLocale maps supported language variants", () => {
  const locales = ["zh-CN", "en", "ja", "ko", "es", "fr", "de"];

  assert.equal(app.resolveLocale("zh-TW", locales), "zh-CN");
  assert.equal(app.resolveLocale("ja-JP", locales), "ja");
  assert.equal(app.resolveLocale("ko-KR", locales), "ko");
  assert.equal(app.resolveLocale("es-MX", locales), "es");
  assert.equal(app.resolveLocale("fr-CA", locales), "fr");
  assert.equal(app.resolveLocale("de-AT", locales), "de");
  assert.equal(app.resolveLocale("pt-BR", locales), "en");
});

test("renderMissions correctly renders mission cards to the DOM", () => {
  const mockMissions = [
    {
      id: "mission-1",
      title: "Test Mission 1",
      missionType: "starlink",
      status: "upcoming",
      vehicle: "Falcon 9",
      launchSite: "LC-39A",
      returnSite: "ASDS",
      launchAt: "2026-05-10T12:00:00Z",
      launchWindow: { open: null, close: null }
    }
  ];

  // Call the function
  app.renderMissions(mockMissions);

  // Assert DOM updates
  const grid = document.querySelector("#missions-grid");
  const cards = grid.querySelectorAll(".mission-card");
  
  assert.equal(cards.length, 1);
  
  const titleEl = cards[0].querySelector(".mission-title");
  assert.equal(titleEl.textContent, "Test Mission 1");
  
  const typeEl = cards[0].querySelector(".mission-type");
  assert.equal(typeEl.textContent, "Starlink");
  
  const vehicleEl = cards[0].querySelector(".vehicle");
  assert.equal(vehicleEl.textContent, "Falcon 9");
});

test("renderMissions hydrates SpaceX mission details into cards", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const pathname = new URL(String(url), "http://localhost").pathname;

    if (pathname === "/api/launches/detail-mission") {
      return new Response(JSON.stringify({
        details: {
          summary: "Falcon 9 is targeting this Starlink launch. Following stage separation, the first stage will land on a droneship.",
          timelines: {
            preLaunch: {
              entries: [
                { time: "00:38:00", description: "Launch Director verifies go for propellant load" },
              ],
            },
            postLaunch: {
              entries: [
                { time: "00:02:26", description: "Main engine cutoff" },
              ],
            },
          },
          webcasts: [
            { url: "https://x.com/SpaceX/status/123", streamingVideoType: "x.com" },
          ],
          media: {
            infographicDesktop: {
              url: "https://example.com/infographic-large.webp",
              originalUrl: "https://example.com/infographic-original.webp",
            },
          },
        },
      }));
    }

    return originalFetch(url);
  };

  try {
    app.renderMissions([
      {
        id: "mission-detail",
        slug: "detail-mission",
        title: "Detail Mission",
        missionType: "starlink",
        status: "upcoming",
        vehicle: "Falcon 9",
        launchSite: "SLC-40",
        returnSite: "ASDS",
        launchAt: "2026-05-10T12:00:00Z",
        launchWindow: { open: null, close: null },
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const card = document.querySelector("#missions-grid .mission-card");
    const details = card.querySelector(".mission-details");
    const actions = card.querySelectorAll(".mission-action-link");

    assert.equal(details.hidden, false);
    assert.match(card.querySelector(".mission-summary").textContent, /Falcon 9 is targeting/);
    assert.equal(card.querySelector(".mission-timeline-list li span").textContent, "00:38:00");
    assert.equal(actions[0].textContent, "Webcast");
    assert.equal(actions[0].getAttribute("href"), "https://x.com/SpaceX/status/123");
    assert.equal(actions[1].textContent, "Infographic");
    assert.equal(card.querySelector(".selected-infographic"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("renderHistoryMissions renders success failure and unknown cards", () => {
  const mockMissions = [
    {
      id: "history-1",
      title: "Success Mission",
      vehicle: "Falcon 9",
      launchSite: "LC-39A",
      launchAt: "2020-05-30T19:22:00.000Z",
      success: true,
      details: "A successful mission.",
      missionUrl: "https://example.com/success",
      image: null
    },
    {
      id: "history-2",
      title: "Failure Mission",
      vehicle: "Falcon 9",
      launchSite: "SLC-40",
      launchAt: "2021-06-28T14:21:00.000Z",
      success: false,
      details: null,
      missionUrl: null,
      image: null
    },
    {
      id: "history-3",
      title: "Unknown Mission",
      vehicle: null,
      launchSite: null,
      launchAt: "2010-06-04T18:45:00.000Z",
      success: null,
      details: null,
      missionUrl: null,
      image: null
    }
  ];

  app.renderHistoryMissions(mockMissions);

  const grid = document.querySelector("#history-grid");
  const cards = grid.querySelectorAll(".mission-card");
  const badges = grid.querySelectorAll(".mission-badge");

  assert.equal(cards.length, 3);
  assert.equal(cards[0].querySelector(".mission-title").textContent, "Failure Mission");
  assert.equal(badges[0].textContent, "Failure");
  assert.equal(badges[1].textContent, "Success");
  assert.equal(badges[2].textContent, "Unknown");
  assert.equal(cards[1].querySelector(".history-details-link").textContent, "Launch details");
  assert.equal(cards[1].querySelector(".return-site").closest("div").querySelector("dt").textContent, "Details");
  assert.equal(cards[0].querySelector(".return-site").textContent, "No external page");
  assert.equal(cards[2].querySelector(".vehicle").textContent, "TBD");
});

test("renderCalendar includes upcoming and history missions", () => {
  const calendarMissions = [
    ...app.markCalendarMissions([
      {
        id: "upcoming-1",
        correlationId: "UPCOMING1",
        slug: "upcoming-mission",
        title: "Upcoming Mission",
        missionType: "starlink",
        isLive: false,
        launchAt: "2026-05-10T12:00:00Z"
      }
    ], "upcoming"),
    ...app.markCalendarMissions([
      {
        id: "history-1",
        title: "History Mission",
        success: true,
        launchAt: "2020-05-30T19:22:00.000Z"
      }
    ], "history")
  ];

  const months = app.getCalendarMonths(calendarMissions);

  assert.deepEqual(months, ["2020-05", "2026-05"]);

  app.updateCalendarState(calendarMissions, { launchAt: "2026-05-10T12:00:00Z" });

  assert.equal(document.querySelector("#calendar-month-label").textContent, "May 2026");
  assert.equal(
    document.querySelector("#calendar-events-list .event-list-title").textContent,
    "Upcoming Mission"
  );

  document.querySelector("#calendar-prev").click();

  const events = document.querySelectorAll("#calendar-events-list .event-list-item");
  assert.equal(document.querySelector("#calendar-month-label").textContent, "May 2020");
  assert.equal(events.length, 1);
  assert.equal(events[0].tagName, "BUTTON");
  assert.equal(events[0].querySelector(".event-list-title").textContent, "History Mission");
  assert.equal(events[0].querySelector(".event-list-meta").textContent, "Success");
  assert.equal(events[0].classList.contains("is-history-event"), true);
});

test("calendar selection renders a single mission details panel", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const pathname = new URL(String(url), "http://localhost").pathname;

    if (pathname === "/api/launches/upcoming-mission") {
      return new Response(JSON.stringify({
        details: {
          summary: "Falcon 9 is targeting a Starlink launch from Florida.",
          timelines: {
            preLaunch: {
              entries: [
                { time: "00:38:00", description: "Go for propellant load" },
              ],
            },
            postLaunch: {
              entries: [
                { time: "00:02:26", description: "Main engine cutoff" },
              ],
            },
          },
          webcasts: [{ url: "https://x.com/SpaceX/status/123" }],
          media: {
            imageDesktop: {
              url: "https://example.com/same-hero-large.jpg",
              originalUrl: "https://example.com/same-hero-original.jpg",
            },
            infographicDesktop: {
              url: "https://example.com/info-large.webp",
              originalUrl: "https://example.com/info-original.webp",
            },
          },
        },
      }));
    }

    return originalFetch(url);
  };

  try {
    document.querySelector("#missions-grid").replaceChildren();
    document.querySelector("#history-grid").replaceChildren();

    const calendarMissions = app.markCalendarMissions([
      {
        id: "upcoming-1",
        correlationId: "UPCOMING1",
        slug: "upcoming-mission",
        title: "Upcoming Mission",
        missionType: "starlink",
        status: "upcoming",
        vehicle: "Falcon 9",
        launchSite: "SLC-40",
        returnSite: "ASDS",
        isLive: false,
        launchAt: "2026-05-10T12:00:00Z",
        launchWindow: { open: null, close: null },
      },
    ], "upcoming");

    app.updateCalendarState(calendarMissions, { launchAt: "2026-05-10T12:00:00Z" });
    document.querySelector('.calendar-day[data-date="2026-05-10"]').click();
    assert.equal(document.querySelector("#selected-mission-panel .selected-mission-title"), null);
    assert.equal(document.activeElement, document.querySelector("#calendar-events-list .event-list-item"));

    document.querySelector("#calendar-events-list .event-list-item").click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = document.querySelector("#selected-mission-panel");
    assert.equal(panel.querySelector(".selected-mission-title").textContent, "Upcoming Mission");
    assert.match(panel.querySelector(".selected-mission-summary").textContent, /Starlink launch/);
    assert.equal(panel.querySelector(".selected-timeline-list li span").textContent, "00:38:00");
    assert.equal(panel.querySelector(".selected-mission-link").getAttribute("href"), "https://x.com/SpaceX/status/123");
    assert.match(panel.querySelector(".selected-mission-image").dataset.lowResSrc, /same-hero-large\.jpg/);
    assert.match(panel.querySelector(".selected-mission-image").style.backgroundImage, /same-hero-original\.jpg/);
    assert.equal(panel.querySelector(".selected-mission-image").classList.contains("is-high-res"), true);
    assert.equal(panel.querySelector(".selected-infographic img").getAttribute("src"), "https://example.com/info-original.webp");
    assert.equal(panel.querySelectorAll(".selected-mission-link")[1].getAttribute("href"), "https://example.com/info-original.webp");
    assert.equal(document.querySelector("#missions-grid").childElementCount, 0);
    assert.equal(document.querySelector("#history-grid").childElementCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("calendar selection hydrates history missions from SpaceX details", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const pathname = new URL(String(url), "http://localhost").pathname;

    if (pathname === "/api/launches/history-mission") {
      return new Response(JSON.stringify({
        details: {
          summary: "Historical SpaceX mission details from the mission page.",
          timelines: {
            preLaunch: { entries: [] },
            postLaunch: {
              entries: [
                { time: "00:08:30", description: "First stage landing" },
              ],
            },
          },
          webcasts: [],
          media: {
            imageDesktop: {
              url: "https://example.com/history-large.jpg",
              originalUrl: "https://example.com/history-original.jpg",
            },
          },
        },
      }));
    }

    return originalFetch(url);
  };

  try {
    const calendarMissions = app.markCalendarMissions([
      {
        id: "history-1",
        slug: "history-mission",
        title: "History Mission",
        vehicle: "Falcon 9",
        launchSite: "SLC-40",
        success: true,
        details: null,
        missionUrl: "https://example.com/history",
        launchAt: "2025-05-10T12:00:00Z",
      },
    ], "history");

    app.updateCalendarState(calendarMissions, { launchAt: "2026-05-10T12:00:00Z" });
    document.querySelector("#calendar-events-list .event-list-item").click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = document.querySelector("#selected-mission-panel");
    assert.equal(panel.querySelector(".selected-mission-title").textContent, "History Mission");
    assert.match(panel.querySelector(".selected-mission-summary").textContent, /Historical SpaceX mission details/);
    assert.equal(panel.querySelector(".selected-timeline-list li span").textContent, "00:08:30");
    assert.match(panel.querySelector(".selected-mission-image").style.backgroundImage, /history-original\.jpg/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
