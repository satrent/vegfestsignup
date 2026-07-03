import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { FileUploadComponent } from '../shared/file-upload/file-upload.component';
import { requiredDocTypes } from '../../utils/required-docs';

@Component({
  selector: 'app-documents',
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';
  documents: NonNullable<Registration['documents']> = [];
  registrationStatus: string = '';

  // State for conditional visibility
  onSiteSales = false;
  isFoodVendor = false; // Derived from the shared requiredDocTypes() helper

  constructor() {
    this.form = this.fb.group({
      // COI
      coiOption: ['upload_now', Validators.required],

      // ST-19
      st19Option: ['upload_now'], // Validator added dynamically

      // Food Permit
      foodPermitOption: ['upload_now'] // Validator added dynamically
    });
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.registrationStatus = reg.status;
        this.documents = reg.documents || [];
        this.onSiteSales = !!reg.onSiteSales;

        // Food-permit requirement comes from the shared required-docs helper,
        // the single source of truth shared with the admin dashboard.
        this.isFoodVendor = requiredDocTypes(reg).includes('Food Permit');

        this.form.patchValue({
          coiOption: reg.coiOption || 'upload_now',
          st19Option: reg.st19Option || 'upload_now',
          foodPermitOption: reg.foodLicenseUrl ? 'upload_now' : 'upload_now' // We don't have a specific option field for this in historic data, defaulting
        });

        // If an approved exhibitor returns to upload a missing doc, switch 'later' → 'upload_now'
        // so the upload widget is immediately visible instead of hidden behind the radio selection.
        if (reg.status === 'Approved') {
          if (reg.coiOption === 'later' && !this.hasDoc('COI')) {
            this.form.patchValue({ coiOption: 'upload_now' });
          }
          if (reg.st19Option === 'later' && !this.hasDoc('ST-19')) {
            this.form.patchValue({ st19Option: 'upload_now' });
          }
          if (this.isFoodVendor && !this.hasDoc('Food Permit')) {
            this.form.patchValue({ foodPermitOption: 'upload_now' });
          }
        }

        // Setup validators
        this.updateValidators();

        // Lock documents only once a decision has been made (Declined/Cancelled).
        // Pending/Approved applications remain editable.
        if (reg.status === 'Declined' || reg.status === 'Cancelled') {
          this.form.disable();
          this.saving = true;
        }
      }
    });
  }

  checkMissingDocs(): boolean {
    const missingCOI = !this.hasDoc('COI');
    const missingST19 = !this.hasDoc('ST-19');
    const missingFoodPermit = this.isFoodVendor && !this.hasDoc('Food Permit');
    return missingCOI || missingST19 || missingFoodPermit;
  }

  updateValidators() {
    const st19Ctrl = this.form.get('st19Option');
    st19Ctrl?.setValidators(Validators.required);
    st19Ctrl?.updateValueAndValidity();

    const foodCtrl = this.form.get('foodPermitOption');
    if (this.isFoodVendor) {
      foodCtrl?.setValidators(Validators.required);
    } else {
      foodCtrl?.clearValidators();
    }
    foodCtrl?.updateValueAndValidity();
  }

  getDoc(type: string) {
    // Latest doc of the type wins — older entries may linger from before
    // re-uploads superseded them (e.g. a rejected COI followed by a new one).
    const matches = this.documents.filter(d => d.type === type);
    return matches.length ? matches[matches.length - 1] : undefined;
  }

  // Check if file is uploaded for a given type
  hasDoc(type: string): boolean {
    return !!this.getDoc(type);
  }

  onUpload(event: any) {
    // Update local state so the UI reflects the new file.
    // Mirror the API: the new upload supersedes older Pending/Rejected docs
    // of the same type, so the section save doesn't write stale entries back.
    const doc = event.document;
    this.documents = this.documents.filter(d => d.type !== doc.type || d.status === 'Approved');
    this.documents.push(doc);
  }

  onRemoveDoc(type: string) {
    this.documents = this.documents.filter(d => d.type !== type);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Validate Files exist if "upload_now" is selected
    if (this.form.get('coiOption')?.value === 'upload_now' && !this.hasDoc('COI')) {
      alert('Please upload your Certificate of Insurance.');
      return;
    }

    if (this.form.get('st19Option')?.value === 'upload_now' && !this.hasDoc('ST-19')) {
      alert('Please upload your ST-19 form.');
      return;
    }

    if (this.isFoodVendor && this.form.get('foodPermitOption')?.value === 'upload_now' && !this.hasDoc('Food Permit')) {
      alert('Please upload your State of Minnesota food permit.');
      return;
    }

    if (this.registrationId) {
      this.saving = true;
      const updates: any = {
        ...this.form.value,
        'sectionStatus.documents': true,
        documents: this.documents
      };

      this.storageService.updateRegistration(this.registrationId, updates).subscribe({
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

