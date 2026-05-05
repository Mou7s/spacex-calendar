import test from "node:test";
import assert from "node:assert/strict";
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
      <a id="calendar-link"></a>
      <code id="ics-url"></code>
      <code id="webcal-url"></code>
      <meta id="meta-description" content="" />
      <button id="calendar-prev"></button>
      <button id="calendar-next"></button>
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
globalThis.fetch = async () => new Response(JSON.stringify({ missions: [] }));

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
