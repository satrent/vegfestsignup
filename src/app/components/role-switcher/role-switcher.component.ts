import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, UserRole } from '../../services/auth.service';

@Component({
  selector: 'app-role-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-switcher.component.html',
  styleUrls: ['./role-switcher.component.scss']
})
export class RoleSwitcherComponent {
  private authService = inject(AuthService);
  currentRole$ = this.authService.currentRole$;

  onRoleChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.authService.setRole(select.value as UserRole);
  }
}
