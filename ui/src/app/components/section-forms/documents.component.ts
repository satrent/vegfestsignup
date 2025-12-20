import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { FileUploadComponent } from '../shared/file-upload/file-upload.component';

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

  // State for conditional visibility
  onSiteSales = false;

  constructor() {
    this.form = this.fb.group({
      // COI
      coiOption: ['upload_now', Validators.required],

      // ST-19
      st19Option: ['upload_now'] // Validator added dynamically
    });
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.documents = reg.documents || [];
        this.onSiteSales = !!reg.onSiteSales;

        this.form.patchValue({
          coiOption: reg.coiOption || 'upload_now',
          st19Option: reg.st19Option || 'upload_now'
        });

        // Setup ST-19 validators based on Sales status
        this.updateValidators();

        if (reg.status !== 'In Progress') {
          this.form.disable();
          this.saving = true;
        }
      }
    });
  }

  updateValidators() {
    const st19Ctrl = this.form.get('st19Option');
    if (this.onSiteSales) {
      st19Ctrl?.setValidators(Validators.required);
    } else {
      st19Ctrl?.clearValidators();
    }
    st19Ctrl?.updateValueAndValidity();
  }

  getDoc(type: string) {
    return this.documents.find(d => d.type === type);
  }

  // Check if file is uploaded for a given type
  hasDoc(type: string): boolean {
    return !!this.getDoc(type);
  }

  onUpload(event: any) {
    // Update local state so the UI reflects the new file
    const doc = event.document;
    const index = this.documents.findIndex(d => d.type === doc.type);
    if (index >= 0) {
      this.documents[index] = doc;
    } else {
      this.documents.push(doc);
    }
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

    if (this.onSiteSales && this.form.get('st19Option')?.value === 'upload_now' && !this.hasDoc('ST-19')) {
      alert('Please upload your ST-19 form.');
      return;
    }

    if (this.registrationId) {
      this.saving = true;
      const updates: any = {
        ...this.form.value,
        'sectionStatus.documents': true
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
