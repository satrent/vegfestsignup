import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-todos-report',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './todos-report.component.html',
    styleUrls: ['./todos-report.component.scss']
})
export class TodosReportComponent implements OnInit {
    private storageService = inject(StorageService);

    loading = true;
    error = '';
    reportData: any[] = [];
    today = new Date();

    filterStatus: 'all' | 'In Progress' | 'Pending' | 'Approved' | 'Declined' = 'all';
    filterAlphaGroup: '' | 'A-J' | 'K-S' | 'T-Z' = '';
    sortAlpha = false;

    get filteredData(): any[] {
        const filtered = this.reportData.filter(row => {
            const statusMatch = this.filterStatus === 'all' || row.status === this.filterStatus;

            let alphaGroupMatch = true;
            if (this.filterAlphaGroup) {
                const firstChar = (row.organizationName || '').trim().charAt(0).toUpperCase();
                const isLetter = /[A-Z]/.test(firstChar);
                if (this.filterAlphaGroup === 'A-J') {
                    alphaGroupMatch = isLetter && firstChar >= 'A' && firstChar <= 'J';
                } else if (this.filterAlphaGroup === 'K-S') {
                    alphaGroupMatch = isLetter && firstChar >= 'K' && firstChar <= 'S';
                } else if (this.filterAlphaGroup === 'T-Z') {
                    alphaGroupMatch = !isLetter || (firstChar >= 'T' && firstChar <= 'Z');
                }
            }

            return statusMatch && alphaGroupMatch;
        });

        if (this.sortAlpha) {
            return [...filtered].sort((a, b) =>
                a.organizationName.localeCompare(b.organizationName, undefined, { sensitivity: 'base' })
            );
        }
        return filtered;
    }

    get hasActiveFilters(): boolean {
        return this.filterStatus !== 'all' || !!this.filterAlphaGroup || this.sortAlpha;
    }

    clearFilters(): void {
        this.filterStatus = 'all';
        this.filterAlphaGroup = '';
        this.sortAlpha = false;
    }

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading = true;
        this.error = '';

        this.storageService.getTodoReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading to-do report:', err);
                this.error = 'Failed to load report data.';
                this.loading = false;
            }
        });
    }

    printReport(): void {
        window.print();
    }

    exportCsv(): void {
        if (this.filteredData.length === 0) return;

        let csvContent = 'Organization Name,First Name,Last Name,Email,Phone,Status,Outstanding To-Dos\n';

        this.filteredData.forEach(row => {
            const todosStr = (row.todoItems || []).map((t: any) => t.text).join('; ');
            csvContent += `${this.escapeCsv(row.organizationName)},${this.escapeCsv(row.firstName)},${this.escapeCsv(row.lastName)},${this.escapeCsv(row.email)},${this.escapeCsv(row.phone)},${this.escapeCsv(row.status)},${this.escapeCsv(todosStr)}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vegfest_todos_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private escapeCsv(field: any): string {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }
}
