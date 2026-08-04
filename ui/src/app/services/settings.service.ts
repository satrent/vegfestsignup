import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface PublicSettings {
    registrationsOpen: boolean;
    closedMessage: string;
    submissionsOpen: boolean;
    submissionsClosedMessage: string;
}

export interface AppSettings extends PublicSettings {
    _id: string;
    updatedBy?: string;
    updatedAt?: string;
}

const FALLBACK_SETTINGS: PublicSettings = {
    registrationsOpen: true,
    closedMessage: 'Registration is currently closed.',
    submissionsOpen: true,
    submissionsClosedMessage: 'Application submission is currently paused.',
};

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private api = inject(ApiService);

    /**
     * Site-wide settings visible without authentication. If the request fails we
     * fall back to "open" so an API hiccup can't lock people out of signing up.
     */
    getPublicSettings(): Observable<PublicSettings> {
        return this.api.get<PublicSettings>('/settings/public').pipe(
            catchError(() => of(FALLBACK_SETTINGS))
        );
    }

    // Admin only
    getSettings(): Observable<AppSettings> {
        return this.api.get<AppSettings>('/settings');
    }

    // Super Admin only
    updateSettings(changes: Partial<PublicSettings>): Observable<AppSettings> {
        return this.api.patch<AppSettings>('/settings', changes);
    }
}
