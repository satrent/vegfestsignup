import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-sponsorship',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="section-container">
      <h2>Sponsorship & Marketing</h2>
      <div *ngIf="form.disabled" class="alert alert-warning">
        This application has been submitted and is currently locked.
      </div>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        
        <div class="form-group checkbox-group">
          <input id="sponsorshipInterest" type="checkbox" formControlName="sponsorshipInterest">
          <label for="sponsorshipInterest">Are you interested in becoming a sponsor?</label>
        </div>

        <div class="form-group checkbox-group">
          <input id="sponsorExhibiting" type="checkbox" formControlName="sponsorExhibiting">
          <label for="sponsorExhibiting">If you are a sponsor, will you be exhibiting at the festival?</label>
        </div>

        <div class="form-group">
          <label for="logoUrl">Please upload your logo (URL for now).</label>
          <input id="logoUrl" type="text" formControlName="logoUrl" placeholder="URL to logo">
        </div>

        <h3>Twin Cities Veg Fest Coupon Book</h3>
        <p>We are creating a digital coupon book to be distributed to all attendees. Would you like to participate?</p>

        <div class="form-group checkbox-group">
          <input id="couponBookParticipation" type="checkbox" formControlName="couponBookParticipation">
          <label for="couponBookParticipation">Yes, I want to participate in the coupon book.</label>
        </div>

        <div *ngIf="form.get('couponBookParticipation')?.value">
          <div class="form-group">
            <label for="couponOffer">What is your offer? (e.g. BOGO, 20% off, Free item with purchase)</label>
            <input id="couponOffer" type="text" formControlName="couponOffer">
          </div>

          <div class="form-group">
            <label for="couponValidity">Valid dates for the coupon:</label>
            <input id="couponValidity" type="text" formControlName="couponValidity" placeholder="e.g. Sept 1 - Oct 31">
          </div>

          <div class="form-group">
            <label>What forms of the coupon will you accept?</label>
            <div class="checkbox-list">
              <div *ngFor="let type of couponTypes">
                <input type="checkbox" [value]="type" (change)="onCouponTypeChange($event, type)" [checked]="isCouponTypeSelected(type)">
                <label>{{ type }}</label>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="couponCode">If online, what is the coupon code?</label>
            <input id="couponCode" type="text" formControlName="couponCode">
          </div>

          <div class="form-group">
            <label for="couponLogoUrl">Logo for coupon (if different from main logo):</label>
            <input id="couponLogoUrl" type="text" formControlName="couponLogoUrl" placeholder="URL to logo">
          </div>

          <div class="form-group">
            <label for="couponOtherInfo">Any other info for the coupon?</label>
            <textarea id="couponOtherInfo" formControlName="couponOtherInfo" rows="2"></textarea>
          </div>
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
    .checkbox-group { display: flex; align-items: flex-start; gap: 0.5rem; }
    .checkbox-group input { width: auto; margin-top: 0.3rem; }
    .checkbox-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .checkbox-list div { display: flex; align-items: center; gap: 0.5rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
    input[type="text"], textarea, select { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
    .actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
    button { padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; border: none; background: #007bff; color: white; }
    button.secondary { background: #6c757d; }
    button:disabled { opacity: 0.7; cursor: not-allowed; }
  `]
})
export class SponsorshipComponent implements OnInit {
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private router = inject(Router);

  form: FormGroup;
  saving = false;
  registrationId: string = '';

  couponTypes = ['Print', 'Digital (Phone)', 'Online Code'];

  constructor() {
    this.form = this.fb.group({
      sponsorshipInterest: [false],
      sponsorExhibiting: [false],
      logoUrl: [''],
      couponBookParticipation: [false],
      couponOffer: [''],
      couponValidity: [''],
      couponForms: [[]],
      couponCode: [''],
      couponLogoUrl: [''],
      couponOtherInfo: ['']
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

  isCouponTypeSelected(type: string): boolean {
    const selected = this.form.get('couponForms')?.value as string[];
    return selected ? selected.includes(type) : false;
  }

  onCouponTypeChange(event: Event, type: string) {
    const checkbox = event.target as HTMLInputElement;
    const current = this.form.get('couponForms')?.value as string[] || [];

    if (checkbox.checked) {
      this.form.patchValue({ couponForms: [...current, type] });
    } else {
      this.form.patchValue({ couponForms: current.filter(t => t !== type) });
    }
  }

  onSubmit() {
    if (this.form.valid && this.registrationId) {
      this.saving = true;
      const updates: any = {
        ...this.form.value,
        'sectionStatus.sponsorship': true
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
