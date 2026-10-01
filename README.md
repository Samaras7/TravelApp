# Travel Planner

Angular web app for planning trips in a weekly calendar. The UI follows the schedule layout from the assignment: dark navy sidebar, hour rows, one column per weekday and coloured event blocks.

## Features

- **Weekly calendar** (Mon–Sun, 06:00–23:00) with previous / next week and *Today* navigation.
- **Click a time slot** to add a trip: country, city, date, start time, duration and cost (PLN).
- **Weather from a REST API** – [Open-Meteo](https://open-meteo.com/) (free, no API key):
  - Geocoding API turns the city name into coordinates,
  - Forecast API is used for today … +15 days,
  - Archive API is used for past dates.
  Weather can be checked in the form, otherwise it is fetched automatically after saving.
- **Click a trip** to edit or delete it.
- **Agenda view** with all trips in chronological order and the total cost.
- **State is persisted** in `localStorage`, so entries survive page reloads.

## Run

```bash
npm install
npm start          # http://localhost:4200
```

Production build: `npm run build`.

## Project structure

```
src/app/
  app.component.*            calendar, sidebar, agenda
  trip-dialog/               add / edit trip form
  services/trip.service.ts   trips state (signals) + localStorage
  services/weather.service.ts Open-Meteo REST client
  models/                    types and date helpers
```

Built with Angular 19 (standalone components, signals, new control flow).
