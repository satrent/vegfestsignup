import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AdminLoginComponent } from './components/admin-login/admin-login.component';
import { SignupFormComponent } from './components/signup-form/signup-form.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { WebAdminDashboardComponent } from './components/web-admin-dashboard/web-admin-dashboard.component';
import { GoogleAuthCallbackComponent } from './components/google-auth-callback/google-auth-callback.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { DashboardComponent } from './components/dashboard/dashboard.component';

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
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard]
    },
    {
        path: 'dashboard/contact',
        loadComponent: () => import('./components/section-forms/contact-info.component').then(m => m.ContactInfoComponent),
        canActivate: [authGuard]
    },
    {
        path: 'dashboard/products',
        loadComponent: () => import('./components/section-forms/products.component').then(m => m.ProductsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'dashboard/values',
        loadComponent: () => import('./components/section-forms/values.component').then(m => m.ValuesComponent),
        canActivate: [authGuard]
    },
    {
        path: 'dashboard/logistics',
        loadComponent: () => import('./components/section-forms/logistics.component').then(m => m.LogisticsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'dashboard/documents',
        loadComponent: () => import('./components/section-forms/documents.component').then(m => m.DocumentsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'dashboard/profile',
        loadComponent: () => import('./components/section-forms/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuard]
    },
    {
        path: 'dashboard/sponsorship',
        loadComponent: () => import('./components/section-forms/sponsorship.component').then(m => m.SponsorshipComponent),
        canActivate: [authGuard]
    },
    {
        path: 'admin',
        component: AdminDashboardComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN', 'WEB_ADMIN'] }
    },
    {
        path: 'admin/users',
        loadComponent: () => import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent),
        canActivate: [authGuard, roleGuard],
        data: { roles: ['ADMIN'] }
    },
    {
        path: 'web-admin',
        component: WebAdminDashboardComponent,
        canActivate: [authGuard, roleGuard],
        data: { roles: ['WEB_ADMIN'] }
    },
    { path: '**', redirectTo: '/login' }
];
