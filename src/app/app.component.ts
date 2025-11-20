import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleSwitcherComponent } from './components/role-switcher/role-switcher.component';
import { SignupFormComponent } from './components/signup-form/signup-form.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { WebAdminDashboardComponent } from './components/web-admin-dashboard/web-admin-dashboard.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RoleSwitcherComponent,
    SignupFormComponent,
    AdminDashboardComponent,
    WebAdminDashboardComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  authService = inject(AuthService);
}
