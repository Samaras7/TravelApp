import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatHour } from '../models/date-utils';
import { TripDraft, Weather } from '../models/trip.model';
import { WeatherService } from '../services/weather.service';

export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 23;
@Component({
  selector: 'app-trip-dialog',
  imports: [FormsModule],
  templateUrl: './trip-dialog.component.html',
  styleUrl: './trip-dialog.component.css',
})
export class TripDialogComponent implements OnInit {
  readonly trip = input.required<TripDraft>();
  readonly isEdit = input(false);

  readonly saved = output<TripDraft>();
  readonly cancelled = output<void>();
  readonly deleted = output<void>();

  private readonly weatherApi = inject(WeatherService);

  form!: TripDraft;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly formatHour = formatHour;

  readonly hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);
  readonly durations = [1, 2, 3, 4, 5, 6, 7, 8];

  ngOnInit(): void {
    this.form = { ...this.trip() };
  }

  invalidateWeather(): void {
    this.form.weather = undefined;
    this.error.set('');
  }

  get canSubmit(): boolean {
    return !!this.form.country.trim() && !!this.form.city.trim() && !!this.form.date && this.form.cost >= 0;
  }

  checkWeather(): void {
    if (!this.form.city.trim() || !this.form.date) {
      this.error.set('Enter a city and a date first.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.weatherApi.getWeather(this.form.city, this.form.country, this.form.date).subscribe({
      next: (w: Weather) => {
        this.form.weather = w;
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.form.weather = undefined;
        this.error.set(err instanceof Error && !('status' in err) ? err.message : 'Weather service is unavailable.');
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    if (!this.canSubmit) return;
    const start = Number(this.form.startHour);
    const duration = Math.min(Number(this.form.duration), GRID_END_HOUR - start);
    this.saved.emit({
      ...this.form,
      country: this.form.country.trim(),
      city: this.form.city.trim(),
      cost: Number(this.form.cost) || 0,
      startHour: start,
      duration,
    });
  }
}
