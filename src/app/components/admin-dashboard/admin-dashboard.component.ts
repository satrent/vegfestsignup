import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService, Registration } from '../../services/storage.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',\n  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
  private storageService = inject(StorageService);
  registrations$ = this.storageService.registrations$;

  getPendingCount(registrations: Registration[] | null): number {
    return registrations?.filter(r => r.status === 'Pending').length || 0;
  }

  approve(id: string) {
    this.storageService.updateStatus(id, 'Approved');
  }

  reject(id: string) {
    this.storageService.updateStatus(id, 'Rejected');
  }
}

