import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Important for @if, @for
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';

@Component({
  selector: 'app-products',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';
  userType: 'Sponsor' | 'Exhibitor' | 'Both' = 'Exhibitor'; // Default to Exhibitor

  // File Upload State
  productPhotos: string[] = [];
  logoUrl: string | null = null;
  uploadingPhoto = false;
  uploadingLogo = false;

  constructor() {
    this.form = this.fb.group({
      organizationCategory: ['', Validators.required],
      productsDescription: ['', Validators.required],
      // Photos and Logo are handled via component state + hidden implementation details, 
      // but we bind them to the form model on submit.
    });
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.userType = (reg.type as 'Sponsor' | 'Exhibitor' | 'Both') || 'Exhibitor';

        // Patch simple fields
        this.form.patchValue({
          organizationCategory: reg.organizationCategory || '',
          productsDescription: reg.productsDescription || ''
        });

        // Load files
        this.productPhotos = reg.productPhotos || [];
        this.logoUrl = reg.logoUrl || null;

        // Conditional Validation Logic
        if (this.userType === 'Sponsor') {
          // Sponsors (who are NOT Exhibitors) do not need Org Category or Description
          this.form.get('organizationCategory')?.clearValidators();
          this.form.get('organizationCategory')?.updateValueAndValidity();
          this.form.get('productsDescription')?.clearValidators();
          this.form.get('productsDescription')?.updateValueAndValidity();
        }

        if (reg.status !== 'In Progress') {
          this.form.disable();
          this.saving = true; // effectively disables submit
        }
      }
    });
  }

  // File Upload Logic
  onFileSelected(event: any) {
    if (this.uploadingPhoto) return;
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      this.handlePhotoUpload(files);
    }
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handlePhotoUpload(files);
    }
  }

  handlePhotoUpload(files: FileList) {
    if (this.productPhotos.length >= 2) {
      alert('You can only upload up to 2 photos.');
      return;
    }

    // Upload first 2 valid files found
    const filesToUpload = Array.from(files).slice(0, 2 - this.productPhotos.length);

    this.uploadingPhoto = true;
    let completed = 0;

    filesToUpload.forEach(file => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File ${file.name} is too large (Max 20MB).`);
        completed++;
        if (completed === filesToUpload.length) this.uploadingPhoto = false;
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert(`File ${file.name} is not a valid image. JPG and PNG only.`);
        completed++;
        if (completed === filesToUpload.length) this.uploadingPhoto = false;
        return;
      }

      this.storageService.uploadDocument(file, 'product-photo').subscribe({
        next: (res: any) => {
          this.productPhotos.push(res.key); // storing Key/URL
          completed++;
          if (completed === filesToUpload.length) this.uploadingPhoto = false;
        },
        error: (err) => {
          console.error('Upload failed', err);
          alert('Failed to upload photo.');
          completed++;
          if (completed === filesToUpload.length) this.uploadingPhoto = false;
        }
      });
    });
  }

  removePhoto(index: number, event: Event) {
    event.stopPropagation();
    this.productPhotos.splice(index, 1);
  }

  // Logo Logic
  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.handleLogoUpload(file);
  }

  onLogoDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files[0];
    if (file) this.handleLogoUpload(file);
  }

  handleLogoUpload(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      alert('File is too large (Max 20MB).');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Invalid file type. JPG and PNG only.');
      return;
    }

    this.uploadingLogo = true;
    this.storageService.uploadDocument(file, 'Logo').subscribe({
      next: (res: any) => {
        this.logoUrl = res.key;
        this.uploadingLogo = false;
      },
      error: (err) => {
        console.error('Logo upload failed', err);
        alert('Failed to upload logo.');
        this.uploadingLogo = false;
      }
    });
  }

  removeLogo(event: Event) {
    event.stopPropagation();
    this.logoUrl = null;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Add visual cue class if needed
  }

  // Helpers
  getPhotoUrl(keyOrUrl: string): string {
    // In a real app we might need to sign this or prepend the bucket URL.
    // Assuming the key is enough or the backend returns a full URL.
    // If `key` is just a key, we might need a helper. 
    // For now, let's assume the upload returns a usable URL or we use the signed URL endpoint.
    // BUT, to keep it simple and immediate without async in view:
    // We'll rely on a presumed public URL structure or that `uploadDocument` returns the full Location.
    // If it only returns key, we might need to refactor to store full URL.
    // Let's assume for now `res.location` is what we want, but `uploadDocument` signature returns `any`.
    // Let's try to just return it.
    return keyOrUrl.startsWith('http') ? keyOrUrl : `https://veg-fest-hub-assets.s3.us-east-1.amazonaws.com/${keyOrUrl}`;
    // ^ Hardcoding bucket URL for preview if key is stored, or better yet, update upload to return full `Location`.
  }

  isImage(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.startsWith('data:image');
  }

  getFileName(url: string): string {
    if (!url) return '';
    return url.split('/').pop() || 'file';
  }

  onSubmit() {
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    // Check photo requirement only if user is NOT just a Sponsor
    // i.e. Exhibitor or Both MUST upload photos. Sponsor-only DOES NOT need product photos.
    if (this.userType !== 'Sponsor' && this.productPhotos.length === 0) {
      // maybe show error? The template handles showing the error but we should block submit
      return;
    }

    if (this.registrationId) {
      this.saving = true;
      const updates: Partial<Registration> = {
        organizationCategory: this.form.value.organizationCategory,
        productsDescription: this.form.value.productsDescription,
        productPhotos: this.productPhotos,
        logoUrl: this.logoUrl || undefined,
        // sectionStatus is managed by backend merging or we can send it explicitly but StorageService types it well.
      };

      const payload: any = {
        ...updates,
        'sectionStatus.products': true
      };

      this.storageService.updateRegistration(this.registrationId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('Error saving section:', err);
          this.saving = false;
          alert('Failed to save. Please try again.');
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
}
