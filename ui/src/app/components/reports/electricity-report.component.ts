import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-electricity-report',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './electricity-report.component.html',
    styleUrls: ['./electricity-report.component.scss']
})
export class ElectricityReportComponent implements OnInit {
    private storageService = inject(StorageService);

    loading = true;
    error = '';
    reportData: any[] = [];
    today = new Date();

    filterAlphaGroup: '' | 'A-J' | 'K-S' | 'T-Z' = '';
    sortAlpha = false;
    includeTest = false;

    get filteredData(): any[] {
        const filtered = this.reportData.filter(row => {
            if (!this.includeTest && row.isTest) return false;
            if (!this.filterAlphaGroup) return true;
            const firstChar = (row.organizationName || '').trim().charAt(0).toUpperCase();
            const isLetter = /[A-Z]/.test(firstChar);
            if (this.filterAlphaGroup === 'A-J') return isLetter && firstChar >= 'A' && firstChar <= 'J';
            if (this.filterAlphaGroup === 'K-S') return isLetter && firstChar >= 'K' && firstChar <= 'S';
            if (this.filterAlphaGroup === 'T-Z') return !isLetter || (firstChar >= 'T' && firstChar <= 'Z');
            return true;
        });

        if (this.sortAlpha) {
            return [...filtered].sort((a, b) =>
                a.organizationName.localeCompare(b.organizationName, undefined, { sensitivity: 'base' })
            );
        }
        return filtered;
    }

    get hasActiveFilters(): boolean {
        return !!this.filterAlphaGroup || this.sortAlpha || this.includeTest;
    }

    clearFilters(): void {
        this.filterAlphaGroup = '';
        this.sortAlpha = false;
        this.includeTest = false;
    }

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport(): void {
        this.loading = true;
        this.error = '';

        this.storageService.getElectricityReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading electricity report:', err);
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

        let csvContent = 'Organization Name,First Name,Last Name,Email,Phone,Power Needs,Household Electric,Description,Equipment List\n';

        this.filteredData.forEach(row => {
            const equipmentStr = (row.equipmentList || [])
                .map((eq: any) => {
                    let detail = `${eq.quantity}x ${eq.name}`;
                    const parts = [eq.amps ? eq.amps + 'A' : '', eq.volts ? eq.volts + 'V' : '', eq.watts ? eq.watts + 'W' : ''].filter(Boolean);
                    if (parts.length) detail += ` (${parts.join(', ')})`;
                    return detail;
                })
                .join('; ');
            const householdElectric = row.householdElectric === true ? 'Yes' : row.householdElectric === false ? 'No' : '';
            csvContent += `${this.escapeCsv(row.organizationName)},${this.escapeCsv(row.firstName)},${this.escapeCsv(row.lastName)},${this.escapeCsv(row.email)},${this.escapeCsv(row.phone)},${this.escapeCsv(row.powerNeeds)},${this.escapeCsv(householdElectric)},${this.escapeCsv(row.electricNeedsDescription)},${this.escapeCsv(equipmentStr)}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vegfest_electricity_report_${new Date().toISOString().split('T')[0]}.csv`);
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
