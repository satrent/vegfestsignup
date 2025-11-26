import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AdminLoginComponent } from './components/admin-login/admin-login.component';
import { SignupFormComponent } from './components/signup-form/signup-form.component';
import { RegistrationStatusComponent } from './components/registration-status/registration-status.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { WebAdminDashboardComponent } from './components/web-admin-dashboard/web-admin-dashboard.component';
import { GoogleAuthCallbackComponent } from './components/google-auth-callback/google-auth-callback.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'admin-login', component: AdminLoginComponent },
    { path: 'auth/google/callback', component: GoogleAuthCallbackComponent },
    {
        path: 'signup',
        component: SignupFormComponent,
        canActivate: [authGuard]
    },
    {
        path: 'registration-status',
        component: RegistrationStatusComponent,
        canActivate: [authGuard]
    },
    {
        path: 'admin',
        component: AdminDashboardComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'WEB_ADMIN'] }
    },
    {
        path: 'web-admin',
        component: WebAdminDashboardComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['WEB_ADMIN'] }
    },
    { path: '**', redirectTo: '/login' }
];
