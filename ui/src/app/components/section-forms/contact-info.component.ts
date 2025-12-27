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
  isSponsor = false;

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
        phone: ['', [Validators.pattern(/^\d{3}-\d{3}-\d{4}$/)]],
        email: ['', Validators.email]
      }),

      establishedDate: [''],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{3}-\d{3}-\d{4}$/)]],

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

      // Sponsorship
      sponsorshipLevel: [''],
      swagBagParticipation: [null],
      swagDistributionInterest: [''],
      swagDistributionItem: [''],
      palletsDonation: [false],
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
    // Initial check for visibility on load
    this.updateOnSiteVisibility(this.form.get('onSite')?.value);

    // Subscribe to changes
    this.form.get('onSite')?.valueChanges.subscribe(val => {
      this.updateOnSiteVisibility(val);
    });
    this.storageService.getLatestRegistration().subscribe(reg => {
      if (reg && reg._id) {
        this.registrationId = reg._id;
        this.isSponsor = reg.type === 'Sponsor' || reg.type === 'Both';

        if (this.isSponsor) {
          this.form.get('sponsorshipLevel')?.addValidators(Validators.required);
          this.form.get('swagBagParticipation')?.addValidators(Validators.required);
        }

        this.form.patchValue(reg);

        // Lock form if not In Progress
        if (reg.status !== 'In Progress') {
          this.form.disable();
          this.saving = true; // Visual lock
        }
      }
    });

    // Sponsorship Logic
    this.form.get('sponsorshipLevel')?.valueChanges.subscribe(val => {
      if (val === 'product') {
        this.form.get('swagBagParticipation')?.setValue(true);
        this.form.get('swagBagParticipation')?.disable({ emitEvent: false });
      } else {
        this.form.get('swagBagParticipation')?.enable({ emitEvent: false });
      }
    });

    this.form.get('swagBagParticipation')?.valueChanges.subscribe(val => {
      if (val === true) {
        this.form.get('swagDistributionInterest')?.setValidators(Validators.required);
        this.form.get('swagDistributionItem')?.setValidators(Validators.required);
      } else {
        this.form.get('swagDistributionInterest')?.clearValidators();
        this.form.get('swagDistributionItem')?.clearValidators();
        this.form.get('swagDistributionInterest')?.setValue('');
        this.form.get('swagDistributionItem')?.setValue('');
        this.form.get('palletsDonation')?.setValue(false);
      }
      this.form.get('swagDistributionInterest')?.updateValueAndValidity();
      this.form.get('swagDistributionItem')?.updateValueAndValidity();
    });

    this.form.get('swagDistributionInterest')?.valueChanges.subscribe(val => {
      if (val !== 'products') {
        this.form.get('palletsDonation')?.setValue(false);
      }
    });

    // Phone formatting listeners
    this.form.get('phone')?.valueChanges.subscribe(value => {
      if (value) {
        const formatted = this.formatPhoneNumber(value);
        if (formatted !== value) {
          this.form.get('phone')?.setValue(formatted, { emitEvent: false });
        }
      }
    });

    this.form.get('onSiteContact.phone')?.valueChanges.subscribe(value => {
      if (value) {
        const formatted = this.formatPhoneNumber(value);
        if (formatted !== value) {
          this.form.get('onSiteContact.phone')?.setValue(formatted, { emitEvent: false });
        }
      }
    });
    this.form.get('instagram')?.valueChanges.subscribe(value => {
      if (value) {
        const handle = this.normalizeHandle(value);
        if (handle !== value) {
          this.form.get('instagram')?.setValue(handle, { emitEvent: false });
        }
      }
    });

    this.form.get('facebook')?.valueChanges.subscribe(value => {
      if (value) {
        const handle = this.normalizeHandle(value);
        if (handle !== value) {
          this.form.get('facebook')?.setValue(handle, { emitEvent: false });
        }
      }
    });
  }

  private formatPhoneNumber(value: string): string {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Format as ###-###-####
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  }

  private normalizeHandle(value: string): string {
    // Remove https://, www., instagram.com/, facebook.com/
    // Also remove leading @ if present (we will display it visually in UI)
    // Actually user wanted to "capture that as an @ sign after the social media url"
    // Wait, "On the front end, let's capture that as an @ sign after the social media url" -> This phrasing is confusing.
    // "Full URLs or @handles; normalize on backend. Let's just store the handle on the backed."
    // "On the front end, let's capture that as an @ sign after the social media url. ???"
    // I interpret this as: Input might be URL, strip it to handle.

    // Let's strip the URL part.
    let handle = value.replace(/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/|facebook\.com\/)/i, '');

    // If it starts with @, keep it or remove it?
    // "let's capture that as an @ sign" -> implies we might want to SHOW the @ sign.
    // Validation on backend seems to strip everything including @ in my regex above...
    // My backend regex: `... @?([a-zA-Z0-9._]+) ... $1` -> This captures the group AFTER the optional @.
    // So backend stores JUST the name "myhandle".

    // If backend stores "myhandle", and UI shows "@myhandle", that's good.
    // Or we can just ensure it doesn't have the URL garbage.

    // Let's just strip the URL part for now, and let them type @ if they want, OR if we want to enforce @ we can.
    // The user said "capture that as an @ sign".
    // Let's stripping URL is the main goal.

    return handle;
  }

  private updateOnSiteVisibility(onSite: string | null): void {
    const contactGroup = this.form.get('onSiteContact');
    if (onSite === 'no' || onSite === 'unsure') {
      contactGroup?.enable({ emitEvent: false });
    } else {
      contactGroup?.disable({ emitEvent: false });
    }
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
