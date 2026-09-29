export interface Weather {
  /** Human readable description, e.g. "Partly cloudy". */
  summary: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  /** Where the data came from (forecast / historical archive). */
  source: 'forecast' | 'archive';
}

export interface Trip {
  id: string;
  country: string;
  city: string;
  /** Trip cost in PLN. */
  cost: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Start hour (0-23). */
  startHour: number;
  /** Duration in hours. */
  duration: number;
  color: string;
  weather?: Weather;
}

export type TripDraft = Omit<Trip, 'id' | 'color'> & { id?: string };
