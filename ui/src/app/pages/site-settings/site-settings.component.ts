import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsService, PublicSettings } from '../../services/settings.service';

@Component({
  selector: 'app-site-settings',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './site-settings.component.html',
  styleUrl: './site-settings.component.scss'
})
export class SiteSettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);

  registrationsOpen = true;
  closedMessage = '';
  submissionsOpen = true;
  submissionsClosedMessage = '';

  loading = false;
  saving = false;
  error = '';
  success = '';

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.error = '';

    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to load settings';
        this.loading = false;
      }
    });
  }

  save(): void {
    this.saving = true;
    this.error = '';
    this.success = '';

    this.settingsService.updateSettings({
      registrationsOpen: this.registrationsOpen,
      closedMessage: this.closedMessage,
      submissionsOpen: this.submissionsOpen,
      submissionsClosedMessage: this.submissionsClosedMessage
    }).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.success = 'Settings saved.';
        this.saving = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to save settings';
        this.saving = false;
      }
    });
  }

  private applySettings(settings: PublicSettings): void {
    this.registrationsOpen = settings.registrationsOpen;
    this.closedMessage = settings.closedMessage;
    this.submissionsOpen = settings.submissionsOpen;
    this.submissionsClosedMessage = settings.submissionsClosedMessage;
  }
}
