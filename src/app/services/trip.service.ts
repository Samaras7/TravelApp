import { Injectable, effect, signal } from '@angular/core';
import { Trip, TripDraft, Weather } from '../models/trip.model';

const STORAGE_KEY = 'travel-planner.trips.v1';
const COLORS = ['#1e9be0', '#e46fbb', '#f39c12', '#a020f0', '#12b5a5', '#e5484d', '#4c9f38'];

function colorFor(text: string): string {
  let hash = 0;
  for (const ch of text.toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

/**
 * Keeps all trips in a signal and mirrors them to localStorage,
 * so entries survive page reloads.
 */
@Injectable({ providedIn: 'root' })
export class TripService {
  readonly trips = signal<Trip[]>(this.load());

  constructor() {
    effect(() => {
      const value = this.trips();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* storage unavailable (private mode, quota) - keep working in memory */
      }
    });
  }

  add(draft: TripDraft): Trip {
    const trip: Trip = {
      ...draft,
      id: crypto.randomUUID(),
      color: colorFor(draft.country || draft.city),
    };
    this.trips.update((list) => [...list, trip]);
    return trip;
  }

  update(id: string, draft: TripDraft): void {
    this.trips.update((list) =>
      list.map((t) =>
        t.id === id ? { ...t, ...draft, id, color: colorFor(draft.country || draft.city) } : t,
      ),
    );
  }

  setWeather(id: string, weather: Weather | undefined): void {
    this.trips.update((list) => list.map((t) => (t.id === id ? { ...t, weather } : t)));
  }

  remove(id: string): void {
    this.trips.update((list) => list.filter((t) => t.id !== id));
  }

  private load(): Trip[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
