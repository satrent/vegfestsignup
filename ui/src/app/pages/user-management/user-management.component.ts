import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService, User, UserRole } from '../../services/auth.service';

interface AdminUser extends User {
  _id: string;
  createdAt?: string;
  lastLoginAt?: string;
  isSuperAdmin?: boolean;
  isApprover?: boolean;
}

@Component({
  selector: 'app-user-management',
  imports: [FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  users: AdminUser[] = [];
  loading = false;
  error = '';
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  selectedUser: AdminUser | null = null;

  // Form data
  formData = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'ADMIN' as UserRole,
    isSuperAdmin: false,
    isApprover: false
  };

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';

    this.api.get<AdminUser[]>('/admin/users').subscribe({
      next: (users) => {
        this.users = users.filter(u => u.role === 'ADMIN' || u.role === 'WEB_ADMIN');
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users';
        console.error(err);
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.formData = {
      email: '',
      firstName: '',
      lastName: '',
      role: 'ADMIN',
      isSuperAdmin: false,
      isApprover: false
    };
    this.showCreateModal = true;
  }

  openEditModal(user: AdminUser): void {
    this.selectedUser = user;
    this.formData = {
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      isSuperAdmin: user.isSuperAdmin || false,
      isApprover: user.isApprover || false
    };
    this.showEditModal = true;
  }

  openDeleteModal(user: AdminUser): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  createUser(): void {
    this.loading = true;
    this.error = '';

    this.api.post('/admin/users', this.formData).subscribe({
      next: () => {
        this.closeModals();
        this.loadUsers();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to create user';
        this.loading = false;
      }
    });
  }

  updateUser(): void {
    if (!this.selectedUser) return;

    this.loading = true;
    this.error = '';

    // We can use the generic PUT endpoint which now handles the new fields if the user is a Super Admin
    // Or we could use the PATCH /role endpoint if we only wanted to update roles, but PUT updates everything.
    this.api.put(`/admin/users/${this.selectedUser._id}`, this.formData).subscribe({
      next: () => {
        this.closeModals();
        this.loadUsers();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to update user';
        this.loading = false;
      }
    });
  }

  deleteUser(): void {
    if (!this.selectedUser) return;

    this.loading = true;
    this.error = '';

    this.api.delete(`/admin/users/${this.selectedUser._id}`).subscribe({
      next: () => {
        this.closeModals();
        this.loadUsers();
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to delete user';
        this.loading = false;
      }
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  }
}
