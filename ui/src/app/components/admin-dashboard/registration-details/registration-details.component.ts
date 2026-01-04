
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

    // Track original values to show changes if needed, or just for cancel

    ngOnChanges(): void {
        if (this.registration && this.isOpen) {
            // Initialize temp copy for editing
            this.tempRegistration = JSON.parse(JSON.stringify(this.registration));
        }
    }

    setActiveTab(tab: string): void {
        this.activeTab = tab;
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
