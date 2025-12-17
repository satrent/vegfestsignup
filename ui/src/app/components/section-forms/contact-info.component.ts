import { Component, OnInit, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-contact-info',
    imports: [ReactiveFormsModule],
    template: `
    <div class="section-container">
      <h2>Contact & Basic Information</h2>
      @if (form.disabled) {
        <div class="alert alert-warning">
          This application has been submitted and is currently locked.
        </div>
      }
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
    
        <div class="form-group">
          <label for="firstName">First Name</label>
          <input id="firstName" type="text" formControlName="firstName">
        </div>
    
        <div class="form-group">
          <label for="lastName">Last Name</label>
          <input id="lastName" type="text" formControlName="lastName">
        </div>
    
        <div class="form-group">
          <label for="organizationName">Organization Name</label>
          <input id="organizationName" type="text" formControlName="organizationName">
        </div>
    
        <div class="form-group">
          <label for="website">Website</label>
          <input id="website" type="url" formControlName="website" placeholder="https://">
        </div>
    
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input id="phone" type="tel" formControlName="phone">
        </div>
    
        <div class="form-group">
          <label for="address">Street Address</label>
          <input id="address" type="text" formControlName="address">
        </div>
    
        <div class="row">
          <div class="form-group third">
            <label for="city">City</label>
            <input id="city" type="text" formControlName="city">
          </div>
          <div class="form-group third">
            <label for="state">State</label>
            <input id="state" type="text" formControlName="state">
          </div>
          <div class="form-group third">
            <label for="zip">Zip Code</label>
            <input id="zip" type="text" formControlName="zip">
          </div>
        </div>
    
        <h3>Social Media</h3>
        <div class="form-group">
          <label for="facebookPage">Facebook Page</label>
          <input id="facebookPage" type="text" formControlName="facebookPage" placeholder="@tcvegfest">
        </div>
    
        <div class="form-group">
          <label for="instagramPage">Instagram Page</label>
          <input id="instagramPage" type="text" formControlName="instagramPage" placeholder="@tcvegfest">
        </div>
    
        <div class="form-group">
          <label for="tiktokPage">TikTok Page</label>
          <input id="tiktokPage" type="text" formControlName="tiktokPage" placeholder="@exploreveg">
        </div>
    
        <div class="form-group">
          <label for="otherSocials">Other Socials / Info</label>
          <textarea id="otherSocials" formControlName="otherSocials" rows="3"></textarea>
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
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    input, textarea { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
    .row { display: flex; gap: 1rem; }
    .third { flex: 1; }
    .actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
    button { padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; border: none; background: #007bff; color: white; }
    button.secondary { background: #6c757d; }
    button:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class ContactInfoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';

  constructor() {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      organizationName: ['', Validators.required],
      website: [''],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zip: ['', Validators.required],
      facebookPage: [''],
      instagramPage: [''],
      tiktokPage: [''],
      otherSocials: ['']
    });
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.form.patchValue(reg);

        // Lock form if not In Progress
        if (reg.status !== 'In Progress') {
          this.form.disable();
          this.saving = true; // Use saving flag to disable submit button visually or add a specific flag
        }
      }
    });
  }

  onSubmit() {
    if (this.form.valid && this.registrationId) {
      this.saving = true;
      const updates: any = {
        ...this.form.value,
        'sectionStatus.contact': true
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
