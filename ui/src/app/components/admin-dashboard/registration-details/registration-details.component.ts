
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Registration, StorageService } from '../../../services/storage.service';

@Component({
    selector: 'app-registration-details',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './registration-details.component.html',
    styleUrls: ['./registration-details.component.scss']
})
export class RegistrationDetailsComponent {
    @Input() registration: Registration | null = null;
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();
    @Output() update = new EventEmitter<Registration>();

    private storageService = inject(StorageService);

    activeTab = 'overview';
    editing = false;
    tempRegistration: Registration | null = null;

    // Tags
    availableTags: string[] = [];
    filteredTags: string[] = [];
    newTagInput = '';


    // Track original values to show changes if needed, or just for cancel

    ngOnChanges(): void {
        if (this.registration && this.isOpen) {
            // Initialize temp copy for editing
            this.tempRegistration = JSON.parse(JSON.stringify(this.registration));
            this.loadTags();
        }
    }

    loadTags(): void {
        this.storageService.getTags().subscribe(tags => {
            this.availableTags = tags;
        });
    }

    addTag(tag: string): void {
        if (!tag || !this.tempRegistration) return;
        const normalized = tag.trim();
        if (!normalized) return;

        if (!this.tempRegistration.tags) {
            this.tempRegistration.tags = [];
        }

        if (!this.tempRegistration.tags.includes(normalized)) {
            this.tempRegistration.tags.push(normalized);
        }
        this.newTagInput = '';
    }

    removeTag(index: number): void {
        if (!this.tempRegistration?.tags) return;
        this.tempRegistration.tags.splice(index, 1);
    }

    onTagInput(event: Event): void {
        const input = (event.target as HTMLInputElement).value;
        this.newTagInput = input;
        this.filteredTags = this.availableTags.filter(t => t.toLowerCase().includes(input.toLowerCase()));
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;
    }

    get displayedDocuments(): any[] {
        if (!this.tempRegistration) return [];
        const docs = [...(this.tempRegistration.documents || [])];
        if (this.tempRegistration.productPhotos?.length) {
            this.tempRegistration.productPhotos.forEach((photoKey, index) => {
                docs.push({
                    type: 'product-photo', // Matches isApprovalRequired check
                    name: `Product Photo ${index + 1}`,
                    key: photoKey,
                    location: '',
                    status: 'Approved', // Valid status, buttons hidden by helper anyway
                    uploadedAt: new Date() // access to date not available for simple string array
                });
            });
        }


        if (this.tempRegistration.logoUrl) {
            docs.push({
                type: 'Logo',
                name: 'Organization Logo',
                key: this.tempRegistration.logoUrl,
                location: '',
                status: 'Approved',
                uploadedAt: new Date()
            });
        }

        if (this.tempRegistration.couponLogoUrl) {
            docs.push({
                type: 'Coupon Logo',
                name: 'Coupon Logo',
                key: this.tempRegistration.couponLogoUrl,
                location: '',
                status: 'Approved',
                uploadedAt: new Date()
            });
        }

        return docs;
    }

    onClose(): void {
        this.close.emit();
        this.activeTab = 'overview';
    }

    save(): void {
        if (!this.tempRegistration || !this.registration?._id) return;

        // Emit the updated registration
        this.storageService.updateRegistration(this.registration._id, this.tempRegistration).subscribe({
            next: (updated) => {
                this.update.emit(updated);
                this.onClose();
            },
            error: (err) => {
                console.error('Failed to update registration', err);
                alert('Failed to update registration');
            }
        });
    }

    // Helper for documents
    isApprovalRequired(doc: any): boolean {
        if (!doc || !doc.type) return true; // Default to requiring approval if type is missing
        const type = doc.type.toLowerCase();
        return type !== 'menu' && type !== 'product-photo' && type !== 'logo' && type !== 'coupon logo';
    }

    // Helper for documents
    updateDocumentStatus(doc: any, status: 'Pending' | 'Approved' | 'Rejected'): void {
        if (!doc) return;
        doc.status = status;
        // Auto-save logic could go here or wait for main save
    }

    viewDocument(key: string): void {
        if (!key) return;
        this.storageService.getDocumentUrl(key).subscribe({
            next: (response) => {
                window.open(response.url, '_blank');
            },
            error: (err) => {
                console.error('Error fetching document URL:', err);
                alert('Failed to open document.');
            }
        });
    }
}
