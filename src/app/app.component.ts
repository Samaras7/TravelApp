import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { addDays, formatHour, parseIso, startOfWeek, toIso } from './models/date-utils';
import { Trip, TripDraft } from './models/trip.model';
import { TripService } from './services/trip.service';
import { WeatherService } from './services/weather.service';
import { GRID_END_HOUR, GRID_START_HOUR, TripDialogComponent } from './trip-dialog/trip-dialog.component';

type View = 'schedule' | 'agenda';

interface DialogState {
  draft: TripDraft;
  editId?: string;
}

@Component({
  selector: 'app-root',
  imports: [TripDialogComponent, DatePipe, CurrencyPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly tripService = inject(TripService);
  private readonly weatherApi = inject(WeatherService);

  readonly view = signal<View>('schedule');
  readonly weekStart = signal(startOfWeek(new Date()));
  readonly dialog = signal<DialogState | null>(null);

  readonly hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);
  readonly gridStart = GRID_START_HOUR;
  readonly formatHour = formatHour;
  readonly todayIso = toIso(new Date());

  readonly days = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.weekStart(), i);
      return { date, iso: toIso(date) };
    }),
  );

  readonly weekEnd = computed(() => addDays(this.weekStart(), 6));

  readonly tripsByDay = computed(() => {
    const map = new Map<string, Trip[]>();
    for (const trip of this.tripService.trips()) {
      const list = map.get(trip.date) ?? [];
      list.push(trip);
      map.set(trip.date, list);
    }
    return map;
  });

  readonly sortedTrips = computed(() =>
    [...this.tripService.trips()].sort((a, b) =>
      a.date === b.date ? a.startHour - b.startHour : a.date.localeCompare(b.date),
    ),
  );

  readonly totalCost = computed(() => this.tripService.trips().reduce((sum, t) => sum + t.cost, 0));

  shiftWeek(weeks: number): void {
    this.weekStart.update((d) => addDays(d, weeks * 7));
  }

  goToday(): void {
    this.weekStart.set(startOfWeek(new Date()));
  }

  tripsOn(iso: string): Trip[] {
    return this.tripsByDay().get(iso) ?? [];
  }

  openNew(iso: string, hour: number): void {
    this.dialog.set({
      draft: { country: '', city: '', cost: 0, date: iso, startHour: hour, duration: 2 },
    });
  }

  openEdit(trip: Trip, event?: Event): void {
    event?.stopPropagation();
    const { id, color: _color, ...rest } = trip;
    this.dialog.set({ draft: { ...rest, id }, editId: id });
  }

  onSave(draft: TripDraft): void {
    const state = this.dialog();
    let id: string;
    if (state?.editId) {
      id = state.editId;
      this.tripService.update(id, draft);
    } else {
      id = this.tripService.add(draft).id;
    }
    this.dialog.set(null);

    if (!draft.weather) {
      this.weatherApi.getWeather(draft.city, draft.country, draft.date).subscribe({
        next: (w) => this.tripService.setWeather(id, w),
        error: () => this.tripService.setWeather(id, undefined),
      });
    }

    this.weekStart.set(startOfWeek(parseIso(draft.date)));
  }

  onDelete(): void {
    const id = this.dialog()?.editId;
    if (id) this.tripService.remove(id);
    this.dialog.set(null);
  }

  top(trip: Trip): number {
    return trip.startHour - GRID_START_HOUR;
  }
}
