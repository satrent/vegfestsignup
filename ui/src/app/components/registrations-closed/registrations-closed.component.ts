import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

@Component({
    selector: 'app-registrations-closed',
    standalone: true,
    imports: [],
    templateUrl: './registrations-closed.component.html',
    styleUrls: ['./registrations-closed.component.scss']
})
export class RegistrationsClosedComponent implements OnInit {
    private settingsService = inject(SettingsService);
    private authService = inject(AuthService);
    private router = inject(Router);

    message = '';
    loading = true;

    ngOnInit(): void {
        this.settingsService.getPublicSettings().subscribe(settings => {
            // If registrations reopened while they sat on this page, send them along.
            if (settings.registrationsOpen) {
                this.router.navigate(['/signup']);
                return;
            }
            this.message = settings.closedMessage;
            this.loading = false;
        });
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
