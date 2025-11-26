import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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

  signupForm: FormGroup;
  submitted = false;
  isDragging = false;
  logoPreview: string | null = null;
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
      website: [''],
      address: [''],
      city: [''],
      state: [''],
      zip: [''],
      description: [''],
      participatedBefore: [false],
      usePreviousLogo: [false],
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

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLogo(event: Event) {
    event.stopPropagation();
    this.logoPreview = null;
  }

  onSubmit() {
    if (this.signupForm.valid) {
      // Use getRawValue() to include disabled fields (email)
      const registrationData = {
        ...this.signupForm.getRawValue(),
        logoUrl: this.logoPreview,
        status: 'Pending' as const
      };

      this.signupForm.disable();

      this.storageService.saveRegistration(registrationData).subscribe({
        next: (response) => {
          this.submitted = true;

          // Reset after 3 seconds
          setTimeout(() => {
            this.submitted = false;
            this.signupForm.reset({ type: 'Exhibitor', participatedBefore: false, usePreviousLogo: false });
            this.logoPreview = null;
            this.signupForm.enable();
            // Re-disable email field and re-populate it
            this.signupForm.get('email')?.disable();
            if (this.userEmail) {
              this.signupForm.patchValue({ email: this.userEmail });
            }
          }, 3000);
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

  toggleLogoUpload() {
    const usePrevious = this.signupForm.get('usePreviousLogo')?.value;
    if (usePrevious) {
      this.logoPreview = null;
    }
  }
}
