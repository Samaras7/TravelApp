import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { diffInDays, parseIso } from '../models/date-utils';
import { Weather } from '../models/trip.model';

/**
 * Weather comes from the free Open-Meteo REST API (no API key needed):
 *  - Geocoding API: city name -> coordinates
 *  - Forecast API:  daily forecast (today .. +16 days)
 *  - Archive API:   historical daily weather (past dates)
 */
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const MAX_FORECAST_DAYS = 15;

interface GeoPlace {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
}

interface GeoResponse {
  results?: GeoPlace[];
}

interface DailyResponse {
  daily?: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
  };
}

/** WMO weather interpretation codes -> label + emoji. */
function describe(code: number): { summary: string; icon: string } {
  if (code === 0) return { summary: 'Clear sky', icon: '☀️' };
  if (code <= 2) return { summary: 'Partly cloudy', icon: '⛅' };
  if (code === 3) return { summary: 'Overcast', icon: '☁️' };
  if (code === 45 || code === 48) return { summary: 'Fog', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { summary: 'Drizzle', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { summary: 'Rain', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { summary: 'Snow', icon: '🌨️' };
  if (code >= 80 && code <= 82) return { summary: 'Rain showers', icon: '🌧️' };
  if (code === 85 || code === 86) return { summary: 'Snow showers', icon: '🌨️' };
  if (code >= 95) return { summary: 'Thunderstorm', icon: '⛈️' };
  return { summary: 'Unknown', icon: '❔' };
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  getWeather(city: string, country: string, isoDate: string): Observable<Weather> {
    return this.geocode(city, country).pipe(switchMap((place) => this.daily(place, isoDate)));
  }

  private geocode(city: string, country: string): Observable<GeoPlace> {
    const params = new HttpParams()
      .set('name', city.trim())
      .set('count', '10')
      .set('language', 'en')
      .set('format', 'json');

    return this.http.get<GeoResponse>(GEOCODING_URL, { params }).pipe(
      map((res) => {
        const results = res.results ?? [];
        if (!results.length) {
          throw new Error(`City "${city}" was not found.`);
        }
        const wanted = country.trim().toLowerCase();
        return (
          results.find((r) => r.country?.toLowerCase() === wanted) ??
          results.find((r) => !!wanted && !!r.country?.toLowerCase().includes(wanted)) ??
          results[0]
        );
      }),
    );
  }

  private daily(place: GeoPlace, isoDate: string): Observable<Weather> {
    const offset = diffInDays(parseIso(isoDate), new Date());
    if (offset > MAX_FORECAST_DAYS) {
      return throwError(
        () => new Error(`Forecast is available only up to ${MAX_FORECAST_DAYS} days ahead.`),
      );
    }

    const source: Weather['source'] = offset < 0 ? 'archive' : 'forecast';
    const params = new HttpParams()
      .set('latitude', place.latitude)
      .set('longitude', place.longitude)
      .set('start_date', isoDate)
      .set('end_date', isoDate)
      .set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum')
      .set('timezone', 'auto');

    return this.http.get<DailyResponse>(source === 'archive' ? ARCHIVE_URL : FORECAST_URL, { params }).pipe(
      map((res) => {
        const d = res.daily;
        const code = d?.weather_code?.[0];
        const max = d?.temperature_2m_max?.[0];
        const min = d?.temperature_2m_min?.[0];
        if (!d || code == null || max == null || min == null) {
          throw new Error('No weather data available for this date yet.');
        }
        return {
          ...describe(code),
          tempMax: Math.round(max),
          tempMin: Math.round(min),
          precipitation: d.precipitation_sum?.[0] ?? 0,
          source,
        };
      }),
    );
  }
}
