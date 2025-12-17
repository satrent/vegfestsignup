import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { UserService } from '../../services/user.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
    selector: 'app-web-admin-dashboard',
    imports: [CommonModule],
    templateUrl: './web-admin-dashboard.component.html',
    styleUrls: ['./web-admin-dashboard.component.scss']
})
export class WebAdminDashboardComponent implements OnInit {
  private storageService = inject(StorageService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  registrations: Registration[] = [];
  users: User[] = [];
  currentFilter: 'Pending' | 'Added' = 'Pending';
  loading = true;
  loadingUsers = false;
  error = '';
  showUserManagement = false;

  ngOnInit(): void {
    this.loadRegistrations();
  }

  loadRegistrations(): void {
    this.loading = true;
    this.error = '';

    this.storageService.loadRegistrations().subscribe({
      next: (data) => {
        this.registrations = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load registrations';
        this.loading = false;
        console.error('Error loading registrations:', err);
      }
    });
  }

  loadUsers(): void {
    if (this.users.length > 0) {
      this.showUserManagement = !this.showUserManagement;
      return;
    }

    this.loadingUsers = true;
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loadingUsers = false;
        this.showUserManagement = true;
      },
      error: (err) => {
        alert('Failed to load users');
        this.loadingUsers = false;
        console.error('Error loading users:', err);
      }
    });
  }

  get approvedRegistrations(): Registration[] {
    return this.registrations.filter(r => r.status === 'Approved');
  }

  get filteredRegistrations(): Registration[] {
    return this.approvedRegistrations.filter(r => {
      const status = r.websiteStatus || 'Pending';
      return status === this.currentFilter;
    });
  }

  get pendingCount(): number {
    return this.approvedRegistrations.filter(r =>
      (r.websiteStatus || 'Pending') === 'Pending'
    ).length;
  }

  get addedCount(): number {
    return this.approvedRegistrations.filter(r =>
      r.websiteStatus === 'Added'
    ).length;
  }

  setFilter(filter: 'Pending' | 'Added'): void {
    this.currentFilter = filter;
  }

  markAsAdded(id: string): void {
    if (!id) return;

    this.storageService.updateWebsiteStatus(id, 'Added').subscribe({
      next: (updatedRegistration) => {
        const index = this.registrations.findIndex(r => r._id === id);
        if (index !== -1) {
          this.registrations[index] = updatedRegistration;
        }
      },
      error: (err) => {
        alert('Failed to update website status');
        console.error('Error updating website status:', err);
      }
    });
  }

  markAsPending(id: string): void {
    if (!id) return;

    this.storageService.updateWebsiteStatus(id, 'Pending').subscribe({
      next: (updatedRegistration) => {
        const index = this.registrations.findIndex(r => r._id === id);
        if (index !== -1) {
          this.registrations[index] = updatedRegistration;
        }
      },
      error: (err) => {
        alert('Failed to update website status');
        console.error('Error updating website status:', err);
      }
    });
  }

  updateUserRole(userId: string, newRole: 'PARTICIPANT' | 'ADMIN' | 'WEB_ADMIN'): void {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      this.userService.updateUserRole(userId, newRole).subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === userId);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
        },
        error: (err) => {
          alert('Failed to update user role');
          console.error('Error updating user role:', err);
        }
      });
    }
  }

  deactivateUser(userId: string): void {
    if (confirm('Are you sure you want to deactivate this user?')) {
      this.userService.deactivateUser(userId).subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === userId);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
        },
        error: (err) => {
          alert('Failed to deactivate user');
          console.error('Error deactivating user:', err);
        }
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
