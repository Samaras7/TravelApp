export interface Weather {
  summary: string;
  icon: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  source: 'forecast' | 'archive';
}

export interface Trip {
  id: string;
  country: string;
  city: string;
  cost: number;
  date: string;
  startHour: number;
  duration: number;
  color: string;
  weather?: Weather;
}

export type TripDraft = Omit<Trip, 'id' | 'color'> & { id?: string };
