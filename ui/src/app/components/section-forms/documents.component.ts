import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService, Registration } from '../../services/storage.service';
import { FileUploadComponent } from '../shared/file-upload/file-upload.component';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent],
  template: `
    <div class="section-container">
      <h2>Licensing & Insurance (Required Documents)</h2>
      <div *ngIf="form.disabled" class="alert alert-warning">
        This application has been submitted and is currently locked.
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        
        <div class="form-group">
          <label>Food license photo: Please upload a photo of your food license (if applicable).</label>
          <app-file-upload 
            documentType="Food License" 
            [currentFile]="getDoc('Food License')"
            [disabled]="form.disabled"
            (uploadComplete)="onUpload($event)">
          </app-file-upload>
        </div>

        <div class="form-group">
          <label>Liability Insurance Requirement: Please upload your Certificate of Insurance (COI).</label>
          <app-file-upload 
            documentType="COI" 
            [currentFile]="getDoc('COI')"
            [disabled]="form.disabled"
            (uploadComplete)="onUpload($event)">
          </app-file-upload>
        </div>

        <div class="form-group">
          <label>ST-19 Requirement: Please upload your ST-19 form.</label>
          <app-file-upload 
            documentType="ST-19" 
            [currentFile]="getDoc('ST-19')"
            [disabled]="form.disabled"
            (uploadComplete)="onUpload($event)">
          </app-file-upload>
        </div>

        <div class="actions">
          <button type="button" class="secondary" (click)="cancel()">Cancel</button>
          <button type="submit" [disabled]="form.disabled || saving">
            {{ saving ? 'Saving...' : 'Save & Complete' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .section-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .alert { padding: 1rem; margin-bottom: 1rem; border-radius: 4px; }
    .alert-warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
    .form-group { margin-bottom: 2rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    .actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
    button { padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; border: none; background: #007bff; color: white; }
    button.secondary { background: #6c757d; }
    button:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class DocumentsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';
  documents: NonNullable<Registration['documents']> = [];

  constructor() {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.documents = reg.documents || [];

        if (reg.status !== 'In Progress') {
          this.form.disable();
          this.saving = true;
        }
      }
    });
  }

  getDoc(type: string) {
    return this.documents.find(d => d.type === type);
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
    if (this.registrationId) {
      this.saving = true;
      const updates: any = {
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
