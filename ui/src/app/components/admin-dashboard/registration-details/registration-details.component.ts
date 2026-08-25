
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Registration, StorageService } from '../../../services/storage.service';
import { AuthService } from '../../../services/auth.service';
import { requiredDocTypes } from '../../../utils/required-docs';

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
    private authService = inject(AuthService);

    activeTab = 'overview';
    editing = false;
    tempRegistration: Registration | null = null;

    // Organization category options — must match the values offered in the
    // participant flow (products.component.html) since they drive fee calculation.
    categoryOptions: string[] = [
        'On-site food prep & sales $600',
        'Food business with on-site food prep — not a restaurant or food truck $350',
        'THC product vendor (exclusively THC products)- $300',
        'For-profit business (if food, prepackaged only; no on-site prep) $200',
        'Nonprofit organization- $150',
        'Animal-focused organization (advocacy, sanctuary) $100',
        'Bookseller, artist, or student group $100',
        'Nonprofit with annual expenses $50,000 or less (half table) $50'
    ];

    // Logistics options — must match the participant flow (logistics.component.ts)
    // and the enums on the Registration model.
    powerOptions = [
        { value: 'None', label: 'None' },
        { value: '5A', label: '5A ($60)' },
        { value: '10A', label: '10A ($80)' },
        { value: '15A', label: '15A ($100)' },
        { value: '20A', label: '20A ($120)' }
    ];
    vehicleOptions: string[] = ['Car', 'SUV', 'Van', 'Box truck', 'Other'];
    loadInOptions: string[] = [
        '2pm to 5pm September 19 (security provided)',
        'Event morning window (6am-8am)',
        'Will decide later'
    ];

    // Tags
    availableTags: string[] = [];
    filteredTags: string[] = [];
    newTagInput = '';


    // Track original values to show changes if needed, or just for cancel

    // Email history (Communications tab)
    emailLogs: any[] = [];
    emailLogsLoading = false;

    ngOnChanges(): void {
        if (this.registration && this.isOpen) {
            // Initialize temp copy for editing
            this.tempRegistration = JSON.parse(JSON.stringify(this.registration));
            this.loadTags();
            this.loadEmailLogs();
        }
    }

    loadEmailLogs(): void {
        if (!this.registration?._id) return;
        this.emailLogsLoading = true;
        this.storageService.getRegistrationLogs(this.registration._id).subscribe({
            next: (logs) => {
                this.emailLogs = logs.filter(
                    // EMAIL_FAILED entries are included so a send that silently
                    // failed is visible here rather than only in server logs.
                    (l: any) => l.action === 'SEND_EMAIL' || l.action === 'SEND_REMINDER' || l.action === 'EMAIL_FAILED'
                );
                this.emailLogsLoading = false;
            },
            error: () => {
                this.emailLogsLoading = false;
            }
        });
    }

    loadTags(): void {
        this.storageService.getTags().subscribe(tags => {
            this.availableTags = tags;
        });
    }

    get isSuperAdmin(): boolean {
        return this.authService.isSuperAdmin();
    }

    get isAdmin(): boolean {
        return this.authService.hasRole(['ADMIN', 'WEB_ADMIN']);
    }

    addTag(tag: string): void {
        if (!tag || !this.tempRegistration) return;
        const normalized = tag.trim();
        if (!normalized) return;

        const tagExists = this.availableTags.some(t => t.toLowerCase() === normalized.toLowerCase());

        if (!tagExists && !this.isSuperAdmin) {
            alert('Only Super Admins can create new tags. Please select an existing tag.');
            return;
        }

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

    // --- Logistics editing helpers ---

    onPowerNeedsChange(value: string): void {
        if (!this.tempRegistration) return;
        this.tempRegistration.powerNeeds = value;
        // Dropping to "None" clears the electric follow-ups so stale answers
        // don't linger on a booth that no longer has power.
        if (!value || value === 'None') {
            this.tempRegistration.householdElectric = undefined;
            this.tempRegistration.electricNeedsDescription = '';
        }
    }

    onHouseholdElectricChange(value: boolean | null): void {
        if (!this.tempRegistration) return;
        this.tempRegistration.householdElectric = value === null ? undefined : value;
        if (value !== false) {
            this.tempRegistration.electricNeedsDescription = '';
        }
    }

    addEquipment(): void {
        if (!this.tempRegistration) return;
        if (!this.tempRegistration.equipmentList) {
            this.tempRegistration.equipmentList = [];
        }
        this.tempRegistration.equipmentList.push({ name: '', quantity: 1 });
    }

    removeEquipment(index: number): void {
        this.tempRegistration?.equipmentList?.splice(index, 1);
    }

    calculateAmps(eq: any): number {
        const qty = eq?.quantity || 0;
        if (eq?.amps) {
            return eq.amps * qty;
        } else if (eq?.watts && eq?.volts) {
            return (eq.watts / eq.volts) * qty;
        }
        return 0;
    }

    get totalAmps(): number {
        return (this.tempRegistration?.equipmentList || [])
            .reduce((sum, eq) => sum + this.calculateAmps(eq), 0);
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
        // Logos and booth/product photos are auto-approved — no review needed.
        // Menu still requires approval, available to all admins (see isAdmin gating).
        return type !== 'product-photo' && type !== 'logo' && type !== 'coupon logo';
    }

    // Rejection reason flow
    rejectingDoc: any = null;
    rejectionReasonInput = '';

    startReject(doc: any): void {
        this.rejectingDoc = doc;
        this.rejectionReasonInput = doc.rejectionReason || '';
    }

    confirmReject(): void {
        if (!this.rejectingDoc) return;
        this.rejectingDoc.status = 'Rejected';
        this.rejectingDoc.rejectionReason = this.rejectionReasonInput.trim();
        this.rejectingDoc = null;
        this.rejectionReasonInput = '';
    }

    cancelReject(): void {
        this.rejectingDoc = null;
        this.rejectionReasonInput = '';
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
    get canApprove(): boolean {
        return this.authService.isApprover();
    }

    // Friendly labels for the required document type codes.
    private readonly docTypeLabels: Record<string, string> = {
        'COI': 'Certificate of Insurance (COI)',
        'ST-19': 'ST-19 Form',
        'Food Permit': 'State of Minnesota Food Permit',
    };

    // Latest status per document type — re-uploads (sorted by uploadedAt)
    // supersede older versions, mirroring required-docs.ts / docsComplete().
    private latestDocStatusByType(): Map<string, string> {
        const latest = new Map<string, string>();
        const docs = [...(this.tempRegistration?.documents || [])].sort(
            (a, b) => new Date(a.uploadedAt || 0).getTime() - new Date(b.uploadedAt || 0).getTime()
        );
        for (const doc of docs) {
            if (!doc.type) continue;
            latest.set(doc.type, doc.status || '');
        }
        return latest;
    }

    // Required docs whose latest version isn't yet Approved, with why.
    // A required doc counts as satisfied only when its latest version is
    // Approved (matching docsComplete()); presence alone is not enough, so a
    // Rejected or still-Pending upload correctly stays on the list.
    //   'missing'  — never uploaded
    //   'rejected' — latest upload was rejected; vendor must re-send
    //   'pending'  — uploaded, awaiting our review
    get outstandingDocuments(): { label: string; state: 'missing' | 'rejected' | 'pending' }[] {
        if (!this.tempRegistration) return [];
        const latest = this.latestDocStatusByType();
        const out: { label: string; state: 'missing' | 'rejected' | 'pending' }[] = [];
        for (const type of requiredDocTypes(this.tempRegistration)) {
            const status = latest.get(type);
            if (status === 'Approved') continue;
            const label = this.docTypeLabels[type] || type;
            if (status === 'Rejected') out.push({ label, state: 'rejected' });
            else if (status === 'Pending') out.push({ label, state: 'pending' });
            else out.push({ label, state: 'missing' });
        }
        return out;
    }

    // Docs to nag the vendor about in a reminder email: never-uploaded or
    // rejected only. Pending docs sit in our review queue, not the vendor's
    // court, so we don't remind about them.
    get missingDocuments(): string[] {
        return this.outstandingDocuments
            .filter(d => d.state !== 'pending')
            .map(d => d.label);
    }
    sendingReminder = false;

    sendReminder(): void {
        const missing = this.missingDocuments;
        if (!this.tempRegistration?._id || missing.length === 0) return;

        this.sendingReminder = true;
        this.storageService.sendDocumentReminder(this.tempRegistration._id, missing).subscribe({
            next: (updated) => {
                this.sendingReminder = false;
                if (this.tempRegistration) {
                    this.tempRegistration.lastReminderSent = updated.lastReminderSent;
                }
                alert('Reminder sent successfully!');
            },
            error: (err) => {
                console.error('Failed to send reminder', err);
                this.sendingReminder = false;
                alert('Failed to send reminder.');
            }
        });
    }

    // --- To-Do Methods ---
    get hasOpenTodos(): boolean {
        return this.tempRegistration?.todoItems?.some(t => !t.isCompleted) || false;
    }

    newTodoText = '';
    isAddingTodo = false;
    togglingTodos = new Set<string>();

    newEmailSubject = '';
    isAddingEmailLog = false;

    // Recognition
    newRecognitionTodoText = '';
    isAddingRecognitionTodo = false;
    togglingRecognitionTodos = new Set<string>();
    newRecognitionNoteText = '';
    isAddingRecognitionNote = false;
    isInitializingRecognitionTodos = false;

    readonly recognizedSponsorshipLevels = ['presenting', 'platinum', 'gold', 'silver', 'bronze', 'product'];

    // Admin document upload
    adminUploadType = 'COI';
    adminUploadFile: File | null = null;
    adminUploadFileName = '';
    isUploading = false;
    adminUploadError = '';
    adminUploadSuccess = '';

    onAdminFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.adminUploadFile = input.files[0];
            this.adminUploadFileName = input.files[0].name;
            this.adminUploadError = '';
        }
    }

    uploadDocument(): void {
        if (!this.adminUploadFile || !this.tempRegistration?._id) return;
        this.isUploading = true;
        this.adminUploadError = '';
        this.adminUploadSuccess = '';
        this.storageService.uploadDocumentForRegistration(
            this.tempRegistration._id,
            this.adminUploadFile,
            this.adminUploadType
        ).subscribe({
            next: (response: any) => {
                if (!this.tempRegistration!.documents) {
                    this.tempRegistration!.documents = [];
                }
                // Mirror the API: the new upload supersedes older Pending/Rejected
                // docs of the same type. Without this, Save Changes would write the
                // stale entries back to the server.
                this.tempRegistration!.documents = this.tempRegistration!.documents.filter(
                    d => d.type !== response.document.type || d.status === 'Approved'
                );
                this.tempRegistration!.documents.push(response.document);
                // Logos are read from dedicated fields elsewhere on the site, not
                // the documents list. Mirror the participant flow so the upload is
                // wired up as the org/coupon logo and persists on Save Changes.
                const logoKey = response.document?.key || response.document?.location;
                if (this.adminUploadType === 'Logo') {
                    this.tempRegistration!.logoUrl = logoKey;
                } else if (this.adminUploadType === 'Coupon Logo') {
                    this.tempRegistration!.couponLogoUrl = logoKey;
                }
                this.adminUploadFile = null;
                this.adminUploadFileName = '';
                this.adminUploadSuccess = `${this.adminUploadType} uploaded successfully.`;
                this.isUploading = false;
            },
            error: (err: any) => {
                this.adminUploadError = err?.error?.message || 'Upload failed.';
                this.isUploading = false;
            }
        });
    }

    isTogglingTodo(id?: string): boolean {
        return id ? this.togglingTodos.has(id) : false;
    }

    addTodo(): void {
        const text = this.newTodoText.trim();
        if (!text || !this.tempRegistration?._id) return;
        
        this.isAddingTodo = true;
        this.storageService.addTodo(this.tempRegistration._id, text).subscribe({
            next: (todo) => {
                if (!this.tempRegistration!.todoItems) {
                    this.tempRegistration!.todoItems = [];
                }
                this.tempRegistration!.todoItems.push(todo);
                this.newTodoText = '';
                this.isAddingTodo = false;
            },
            error: (err) => {
                console.error('Failed to add to-do', err);
                alert('Failed to add to-do');
                this.isAddingTodo = false;
            }
        });
    }

    addEmailLog(): void {
        const subject = this.newEmailSubject.trim();
        if (!subject || !this.registration?._id) return;
        this.isAddingEmailLog = true;
        this.storageService.addEmailLog(this.registration._id, subject).subscribe({
            next: (log) => {
                this.emailLogs.unshift(log);
                this.newEmailSubject = '';
                this.isAddingEmailLog = false;
            },
            error: () => {
                alert('Failed to add email history entry');
                this.isAddingEmailLog = false;
            }
        });
    }

    toggleTodo(todo: any, event: Event): void {
        if (!this.tempRegistration?._id || !todo._id) return;
        const isCompleted = (event.target as HTMLInputElement).checked;

        this.togglingTodos.add(todo._id);
        this.storageService.updateTodo(this.tempRegistration._id, todo._id, isCompleted).subscribe({
            next: (updated) => {
                todo.isCompleted = updated.isCompleted;
                this.togglingTodos.delete(todo._id);
            },
            error: (err) => {
                console.error('Failed to update to-do', err);
                // Revert checkbox
                (event.target as HTMLInputElement).checked = !isCompleted;
                todo.isCompleted = !isCompleted;
                this.togglingTodos.delete(todo._id);
            }
        });
    }

    // --- Recognition Methods ---

    isTogglingRecognitionTodo(id?: string): boolean {
        return id ? this.togglingRecognitionTodos.has(id) : false;
    }

    addRecognitionTodo(): void {
        const text = this.newRecognitionTodoText.trim();
        if (!text || !this.tempRegistration?._id) return;

        this.isAddingRecognitionTodo = true;
        this.storageService.addRecognitionTodo(this.tempRegistration._id, text).subscribe({
            next: (todo) => {
                if (!this.tempRegistration!.recognitionTodos) {
                    this.tempRegistration!.recognitionTodos = [];
                }
                this.tempRegistration!.recognitionTodos.push(todo);
                this.newRecognitionTodoText = '';
                this.isAddingRecognitionTodo = false;
            },
            error: (err) => {
                console.error('Failed to add recognition to-do', err);
                alert('Failed to add recognition to-do');
                this.isAddingRecognitionTodo = false;
            }
        });
    }

    toggleRecognitionTodo(todo: any, event: Event): void {
        if (!this.tempRegistration?._id || !todo._id) return;
        const isCompleted = (event.target as HTMLInputElement).checked;

        this.togglingRecognitionTodos.add(todo._id);
        this.storageService.updateRecognitionTodo(this.tempRegistration._id, todo._id, isCompleted).subscribe({
            next: (updated) => {
                todo.isCompleted = updated.isCompleted;
                this.togglingRecognitionTodos.delete(todo._id);
            },
            error: (err) => {
                console.error('Failed to update recognition to-do', err);
                (event.target as HTMLInputElement).checked = !isCompleted;
                todo.isCompleted = !isCompleted;
                this.togglingRecognitionTodos.delete(todo._id);
            }
        });
    }

    get isApproved(): boolean {
        return this.tempRegistration?.status === 'Approved';
    }

    get isEligibleForRecognitionTodos(): boolean {
        const type = this.tempRegistration?.type;
        const level = this.tempRegistration?.sponsorshipLevel?.toLowerCase();
        if (type === 'Exhibitor') return true;
        if (type === 'Both') return true;
        if (type === 'Sponsor') return !!level && this.recognizedSponsorshipLevels.includes(level);
        return false;
    }

    get canInitializeRecognitionTodos(): boolean {
        return this.isApproved && this.isEligibleForRecognitionTodos;
    }

    get initializeTodosDescription(): string {
        const type = this.tempRegistration?.type;
        const level = this.tempRegistration?.sponsorshipLevel;
        const levelLabel = level ? (level.charAt(0).toUpperCase() + level.slice(1)) : null;
        const hasValidLevel = !!level && this.recognizedSponsorshipLevels.includes(level.toLowerCase());

        if (type === 'Exhibitor') return 'Standard exhibitor to-dos';
        if (type === 'Sponsor' && levelLabel) return `Based on ${levelLabel} sponsorship level`;
        if (type === 'Both') {
            if (hasValidLevel && levelLabel) return `Exhibitor to-dos + ${levelLabel} sponsorship to-dos`;
            return 'Standard exhibitor to-dos';
        }
        return '';
    }

    initializeRecognitionTodos(): void {
        if (!this.tempRegistration?._id) return;

        const existingCount = this.tempRegistration.recognitionTodos?.length ?? 0;
        if (existingCount > 0) {
            const confirmed = confirm(
                `This sponsor already has ${existingCount} recognition to-do(s). Add the initial set anyway?`
            );
            if (!confirmed) return;
        }

        this.isInitializingRecognitionTodos = true;
        this.storageService.initializeRecognitionTodos(this.tempRegistration._id).subscribe({
            next: (todos) => {
                this.tempRegistration!.recognitionTodos = todos;
                this.isInitializingRecognitionTodos = false;
            },
            error: (err) => {
                console.error('Failed to initialize recognition todos', err);
                alert(err?.error?.error || 'Failed to initialize recognition todos');
                this.isInitializingRecognitionTodos = false;
            }
        });
    }

    addRecognitionNote(): void {
        const text = this.newRecognitionNoteText.trim();
        if (!text || !this.tempRegistration?._id) return;

        this.isAddingRecognitionNote = true;
        this.storageService.addRecognitionNote(this.tempRegistration._id, text).subscribe({
            next: (note) => {
                if (!this.tempRegistration!.recognitionNotes) {
                    this.tempRegistration!.recognitionNotes = [];
                }
                this.tempRegistration!.recognitionNotes.push(note);
                this.newRecognitionNoteText = '';
                this.isAddingRecognitionNote = false;
            },
            error: (err) => {
                console.error('Failed to add recognition note', err);
                alert('Failed to add recognition note');
                this.isAddingRecognitionNote = false;
            }
        });
    }
}
