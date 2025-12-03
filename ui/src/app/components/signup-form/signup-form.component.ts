import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup-form.component.html',
  styleUrls: ['./signup-form.component.scss']
})
export class SignupFormComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  signupForm: FormGroup;
  submitted = false;
  userEmail: string = '';

  constructor(
    private fb: FormBuilder,
    private storageService: StorageService
  ) {
    this.signupForm = this.fb.group({
      organizationName: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      phone: [''],
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
      // Use getRawValue() to include disabled fields (email)
      const registrationData = {
        ...this.signupForm.getRawValue(),
        status: 'In Progress' as const
      };

      this.signupForm.disable();

      this.storageService.saveRegistration(registrationData).subscribe({
        next: (response) => {
          this.submitted = true;

          // Redirect to dashboard after 1.5 seconds
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error saving registration:', error);
          alert('Failed to save registration. Please try again.');
          this.signupForm.enable();
          // Re-disable email field
          this.signupForm.get('email')?.disable();
        }
      });
    }
  }
}
