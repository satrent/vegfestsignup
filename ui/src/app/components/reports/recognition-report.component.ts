import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-recognition-report',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './recognition-report.component.html',
    styleUrls: ['./recognition-report.component.scss']
})
export class RecognitionReportComponent implements OnInit {
    private storageService = inject(StorageService);

    activeTab: 'exhibitors' | 'sponsors' = 'exhibitors';
    loading = true;
    error = '';
    reportData: any[] = [];
    today = new Date();

    includeTest = false;

    // Exhibitor filters
    filterAlphaGroup: '' | 'A-J' | 'K-S' | 'T-Z' = '';

    // Sponsor filters
    filterCategory = 'all';
    filterLevel = 'all';

    togglingTodos = new Set<string>();

    readonly SPONSOR_CATEGORIES = ['Magazine Feature', 'Digital & Social', 'At the Festival', 'Naming Rights'];
    readonly SPONSOR_LEVELS = ['presenting', 'platinum', 'gold', 'silver', 'bronze', 'product'];

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading = true;
        this.error = '';
        this.storageService.getRecognitionTodosReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: () => {
                this.error = 'Failed to load report data.';
                this.loading = false;
            }
        });
    }

    // ── Exhibitor tab ──────────────────────────────────────────

    get exhibitorData(): any[] {
        return this.reportData.filter(r => {
            if (!this.includeTest && r.isTest) return false;
            if (r.type !== 'Exhibitor' && r.type !== 'Both') return false;
            if (this.filterAlphaGroup) {
                const ch = (r.organizationName || '').trim().charAt(0).toUpperCase();
                const isLetter = /[A-Z]/.test(ch);
                if (this.filterAlphaGroup === 'A-J') return isLetter && ch >= 'A' && ch <= 'J';
                if (this.filterAlphaGroup === 'K-S') return isLetter && ch >= 'K' && ch <= 'S';
                if (this.filterAlphaGroup === 'T-Z') return !isLetter || (ch >= 'T' && ch <= 'Z');
            }
            return true;
        });
    }

    exhibitorTodos(registration: any): any[] {
        return (registration.recognitionTodos || [])
            .filter((t: any) => !t.isCompleted && (t.category === 'General' || !t.category));
    }

    // ── Sponsor tab ────────────────────────────────────────────

    get sponsorData(): any[] {
        return this.reportData.filter(r => {
            if (!this.includeTest && r.isTest) return false;
            if (r.type !== 'Sponsor' && r.type !== 'Both') return false;
            if (this.filterLevel !== 'all' && r.sponsorshipLevel !== this.filterLevel) return false;
            return true;
        });
    }

    sponsorTodos(registration: any): any[] {
        const sponsorCats = new Set(this.SPONSOR_CATEGORIES);
        let todos = (registration.recognitionTodos || [])
            .filter((t: any) => !t.isCompleted && sponsorCats.has(t.category));
        if (this.filterCategory !== 'all') {
            todos = todos.filter((t: any) => t.category === this.filterCategory);
        }
        return todos;
    }

    // ── Shared ─────────────────────────────────────────────────

    isToggling(registrationId: string, todoId: string): boolean {
        return this.togglingTodos.has(`${registrationId}-${todoId}`);
    }

    toggleTodo(registration: any, todo: any, event: Event): void {
        const isCompleted = (event.target as HTMLInputElement).checked;
        const key = `${registration._id}-${todo._id}`;
        this.togglingTodos.add(key);

        this.storageService.updateRecognitionTodo(registration._id, todo._id, isCompleted).subscribe({
            next: (updated) => {
                todo.isCompleted = updated.isCompleted;
                this.togglingTodos.delete(key);
            },
            error: () => {
                (event.target as HTMLInputElement).checked = !isCompleted;
                this.togglingTodos.delete(key);
            }
        });
    }

    get hasExhibitorFilters(): boolean {
        return !!this.filterAlphaGroup || this.includeTest;
    }

    get hasSponsorFilters(): boolean {
        return this.filterCategory !== 'all' || this.filterLevel !== 'all' || this.includeTest;
    }

    clearExhibitorFilters(): void {
        this.filterAlphaGroup = '';
        this.includeTest = false;
    }

    clearSponsorFilters(): void {
        this.filterCategory = 'all';
        this.filterLevel = 'all';
        this.includeTest = false;
    }

    levelLabel(level: string): string {
        if (!level) return '—';
        return level.charAt(0).toUpperCase() + level.slice(1);
    }

    categoryColor(category: string): string {
        switch (category) {
            case 'Magazine Feature': return '#fef3c7';
            case 'Digital & Social': return '#dbeafe';
            case 'At the Festival':  return '#dcfce7';
            case 'Naming Rights':    return '#f3e8ff';
            default:                 return '#f3f4f6';
        }
    }

    categoryTextColor(category: string): string {
        switch (category) {
            case 'Magazine Feature': return '#92400e';
            case 'Digital & Social': return '#1e40af';
            case 'At the Festival':  return '#166534';
            case 'Naming Rights':    return '#6b21a8';
            default:                 return '#374151';
        }
    }
}
