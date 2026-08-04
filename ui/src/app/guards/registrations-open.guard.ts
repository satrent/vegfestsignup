import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SettingsService } from '../services/settings.service';
import { StorageService } from '../services/storage.service';

/**
 * Guards the sign-up form once new registrations have been turned off.
 *
 * Existing participants are never blocked: if they somehow land here they get
 * sent to their dashboard. Only people with no registration at all see the
 * closed notice. This is a UX gate — the real enforcement is the 403 from
 * POST /api/registrations.
 */
export const registrationsOpenGuard: CanActivateFn = () => {
    const settingsService = inject(SettingsService);
    const storageService = inject(StorageService);
    const router = inject(Router);

    return settingsService.getPublicSettings().pipe(
        switchMap(settings => {
            if (settings.registrationsOpen) {
                return of(true);
            }

            // Closed — but an existing registration still gets through to their own data.
            return storageService.getLatestRegistration().pipe(
                map(() => {
                    router.navigate(['/dashboard']);
                    return false;
                }),
                catchError(() => {
                    router.navigate(['/registrations-closed']);
                    return of(false);
                })
            );
        })
    );
};
