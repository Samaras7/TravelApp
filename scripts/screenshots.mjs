// Generates docs/screenshots/*.png and docs/travel-planner-screenshots.pdf
// Usage: start the app (`npm start`), then run `npm run screenshots`.
// First time only: `npx playwright install chromium`.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE_URL = process.env.APP_URL ?? 'http://localhost:4200';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 820 } });
const shots = [];

async function shot(name, caption) {
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  shots.push({ file, caption });
}

await page.goto(BASE_URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('.day-col');
await shot('01-empty-calendar', '1. Weekly calendar (Schedule view) - empty state.');

async function addTrip(dayIndex, cellIndex, country, city, cost) {
  await page.locator('.day-col').nth(dayIndex).locator('.cell').nth(cellIndex).click();
  await page.fill('input[name=country]', country);
  await page.fill('input[name=city]', city);
  await page.fill('input[name=cost]', String(cost));
  return page;
}

// Trip 1 - click on a slot, fill in the form, check weather from the REST API.
await addTrip(2, 4, 'Italy', 'Rome', 2500);
await shot('02-new-trip-form', '2. Clicking a calendar slot opens the trip form (country, city, cost).');
await page.click('text=Check weather');
await page.waitForSelector('.weather-result, .error', { timeout: 15000 });
await shot('03-weather-from-api', '3. Weather for the chosen city and date, downloaded from the Open-Meteo REST API.');
await page.click('button[type=submit]');
await page.waitForSelector('.trip');

// Trip 2 & 3 - weather is fetched automatically after saving.
await addTrip(0, 2, 'Spain', 'Barcelona', 1800);
await page.click('button[type=submit]');
await addTrip(4, 8, 'France', 'Paris', 3200);
await page.click('button[type=submit]');
await page.waitForTimeout(2500);
await shot('04-calendar-with-trips', '4. Calendar with several planned trips (city, time, cost and weather).');

// Edit dialog.
await page.locator('.trip').first().click();
await shot('05-edit-trip', '5. Clicking an existing trip lets the user edit or delete it.');
await page.click('text=Cancel');

// Agenda view.
await page.click('text=Agenda');
await shot('06-agenda', '6. Agenda view - all trips in chronological order with the total cost.');

// Persistence - reload the page and show that the entries are still there.
await page.reload();
await page.waitForSelector('.agenda-item');
await shot('07-persisted-after-reload', '7. State is kept after reloading the page (stored in localStorage).');

await browser.close();

// ---- Build the PDF from the screenshots ----
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: sans-serif; margin: 0; }
  section { page-break-after: always; padding: 24px; }
  h1 { color: #2e3266; }
  img { width: 100%; border: 1px solid #ccc; }
  p { font-size: 15px; }
</style></head><body>
<section><h1>Travel Planner - screenshots</h1>
<p>Angular application for planning trips in a weekly calendar. Weather data is downloaded from the Open-Meteo REST API and all entries are stored in the browser (localStorage).</p></section>
${shots
  .map(
    (s) =>
      `<section><p>${s.caption}</p><img src="data:image/png;base64,${readFileSync(s.file).toString('base64')}"></section>`,
  )
  .join('\n')}
</body></html>`;

writeFileSync('docs/screenshots.html', html);
const b2 = await chromium.launch();
const p2 = await b2.newPage();
await p2.setContent(html);
await p2.pdf({ path: 'docs/travel-planner-screenshots.pdf', format: 'A4', landscape: true, printBackground: true });
await b2.close();
console.log('Done: docs/travel-planner-screenshots.pdf');
