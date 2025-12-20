import { Component, OnInit, inject } from '@angular/core'; // Force Rebuild

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './signup-form.component.html',
  styleUrls: ['./signup-form.component.scss']
})
export class SignupFormComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);

  signupForm: FormGroup;
  submitted = false;
  userEmail: string = '';

  constructor() {
    this.signupForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      organizationName: ['', Validators.required],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      type: ['Exhibitor', Validators.required]
    });
  }

  ngOnInit(): void {
    // Pre-fill email with authenticated user's email
    this.authService.currentUser$.subscribe(user => {
      if (user?.email) {
        this.userEmail = user.email;
        this.signupForm.patchValue({ email: user.email });
      }
    });
  }

  onSubmit() {
    if (this.signupForm.valid) {
      const registrationData = {
        ...this.signupForm.getRawValue(),
        status: 'In Progress' as const
      };

      this.signupForm.disable();
      this.submitted = true;

      this.storageService.saveRegistration(registrationData).subscribe({
        next: (response) => {
          // Redirect to dashboard immediately or after short delay
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Error saving registration:', error);
          alert('Failed to start registration. Please try again.');
          this.signupForm.enable();
          this.signupForm.get('email')?.disable();
          this.submitted = false;
        }
      });
    }
  }
}
