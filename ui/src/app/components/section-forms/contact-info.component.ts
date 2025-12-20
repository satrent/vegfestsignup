import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-contact-info',
  standalone: true, // It was standalone before
  imports: [ReactiveFormsModule],
  templateUrl: './contact-info.component.html',
  styleUrls: ['./contact-info.component.scss'] // Assuming scss file exists or will work if empty. It was inline template before.
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
      // Basics
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      organizationName: ['', Validators.required],

      onSite: ['yes', Validators.required],
      onSiteContact: this.fb.group({
        firstName: [''],
        lastName: [''],
        phone: [''],
        email: ['', Validators.email]
      }),

      establishedDate: [''],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      phone: ['', Validators.required],

      // Website/Socials
      website: [''],
      instagram: [''],
      facebook: [''],
      // Legacy fields mapping if needed, but we focus on new ones.

      // Address
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zip: ['', Validators.required],

      // History
      participatedBefore: [null, Validators.required],
      soldElsewhere: [''],

      // Demographics & Values
      ownerDemographics: [[]],
      isVeganOwners: [false],
      isVeganProducts: [false],
      // Type is set at signup, usually not editable here or just display it? 
      // We can omit 'type' from here or make it readonly if included.
    }, { validators: [this.websiteOrSocialValidator, this.onSiteContactValidator] });
  }

  // Custom Validator: Website or Social Required
  websiteOrSocialValidator(group: AbstractControl): ValidationErrors | null {
    const website = group.get('website')?.value;
    const instagram = group.get('instagram')?.value;
    const facebook = group.get('facebook')?.value;
    return (website || instagram || facebook) ? null : { websiteOrSocialRequired: true };
  }

  // Custom Validator: On Site Contact Required if Not On Site
  onSiteContactValidator(group: AbstractControl): ValidationErrors | null {
    const onSite = group.get('onSite')?.value;
    const contactGroup = group.get('onSiteContact') as FormGroup;

    if (onSite === 'no' || onSite === 'unsure') {
      const fn = contactGroup.get('firstName')?.value;
      const ln = contactGroup.get('lastName')?.value;
      const phone = contactGroup.get('phone')?.value;
      const email = contactGroup.get('email')?.value;

      if (!fn || !ln || !phone || !email) {
        return { onSiteContactRequired: true };
      }
    }
    return null;
  }

  ngOnInit(): void {
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.form.patchValue(reg);
        // Important: patchValue might not handle nested 'onSiteContact' if reg.onSiteContact matches structure perfectly it will.
        // Also 'email' field is disabled, patchValue works fine.

        // Lock form if not In Progress
        if (reg.status !== 'In Progress') {
          this.form.disable();
          this.saving = true; // Visual lock
        }
      }
    });
  }

  onSubmit() {
    if (this.form.valid && this.registrationId) {
      this.saving = true;

      const updates: any = {
        ...this.form.getRawValue(), // Use getRawValue to include disabled email
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
    } else {
      this.form.markAllAsTouched();
    }
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
}
