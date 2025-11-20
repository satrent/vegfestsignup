import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup-form.component.html',
  styleUrls: ['./signup-form.component.scss']
})
export class SignupFormComponent {
  signupForm: FormGroup;
  submitted = false;
  isDragging = false;
  logoPreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private storageService: StorageService
  ) {
    this.signupForm = this.fb.group({
      organizationName: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      website: [''],
      address: [''],
      city: [''],
      state: [''],
      zip: [''],
      description: [''],
      participatedBefore: [false],
      type: ['Exhibitor', Validators.required]
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
      const registrationData = {
        ...this.signupForm.value,
        logoUrl: this.logoPreview
      };

      this.storageService.addRegistration(registrationData);
      this.submitted = true;
      this.signupForm.disable();

      // Reset after 3 seconds for demo purposes
      setTimeout(() => {
        this.submitted = false;
        this.signupForm.reset({ type: 'Exhibitor', participatedBefore: false });
        this.logoPreview = null;
        this.signupForm.enable();
      }, 3000);
    }
  }
}
