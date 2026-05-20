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
      <section id="missions-grid"></section>
      <p id="refresh-note"></p>
      <section id="history-grid"></section>
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
  assert.equal(events[0].getAttribute("href"), "#history-mission-history-1");
  assert.equal(events[0].querySelector(".event-list-title").textContent, "History Mission");
  assert.equal(events[0].querySelector(".event-list-meta").textContent, "Success");
  assert.equal(events[0].classList.contains("is-history-event"), true);
});
