import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="section-container">
      <h2>Licensing & Insurance (Required Documents)</h2>
      <div *ngIf="form.disabled" class="alert alert-warning">
        This application has been submitted and is currently locked.
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        
        <div class="form-group">
          <label for="foodLicenseUrl">Food license photo: Please upload a photo of your food license (if applicable).</label>
          <input id="foodLicenseUrl" type="text" formControlName="foodLicenseUrl" placeholder="URL to document (upload feature coming soon)">
        </div>

        <div class="form-group">
          <label for="insuranceUrl">Liability Insurance Requirement: Please upload your Certificate of Insurance (COI).</label>
          <input id="insuranceUrl" type="text" formControlName="insuranceUrl" placeholder="URL to document">
        </div>

        <div class="form-group">
          <label for="st19Url">ST-19 Requirement: Please upload your ST-19 form.</label>
          <input id="st19Url" type="text" formControlName="st19Url" placeholder="URL to document">
        </div>

        <div class="form-group">
          <label for="st19SubmissionMethod">Which way will you get us the ST-19?</label>
          <select id="st19SubmissionMethod" formControlName="st19SubmissionMethod">
            <option value="">Select option</option>
            <option value="Upload">Upload here</option>
            <option value="Email">Email to organizer</option>
            <option value="Mail">Mail to organizer</option>
          </select>
        </div>

        <div class="actions">
          <button type="button" class="secondary" (click)="cancel()">Cancel</button>
          <button type="submit" [disabled]="form.invalid || saving">
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
    .form-group { margin-bottom: 1.5rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    input[type="text"], select { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
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

  constructor() {
    this.form = this.fb.group({
      foodLicenseUrl: [''],
      insuranceUrl: [''],
      st19Url: [''],
      st19SubmissionMethod: ['']
    });
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.form.patchValue(reg);

        if (reg.status !== 'In Progress') {
          this.form.disable();
          this.saving = true;
        }
      }
    });
  }

  onSubmit() {
    if (this.form.valid && this.registrationId) {
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
