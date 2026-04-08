import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-invoicing-report',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './invoicing-report.component.html',
    styleUrls: ['./invoicing-report.component.scss']
})
export class InvoicingReportComponent implements OnInit {
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

        this.storageService.getInvoicingReport().subscribe({
            next: (data) => {
                this.reportData = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading invoicing report:', err);
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

        let csvContent = 'Organization Name,Contact Name,Email,Phone,Type,Status,Invoiced,Base Fee,Discount,BIPGM Owned,Est. Month,Est. Year,Security Deposit,Extra Site Cost,Equipment Cost,Special Power Fee,Initial Invoice Amount,Amount Paid,Quickbooks Invoice Link\n';

        this.filteredData.forEach(row => {
            const contactName = `${row.firstName} ${row.lastName}`;
            const invoiced = row.invoiced ? 'Yes' : 'No';

            // Historical breakdown fields (or 0 if missing/not yet exported)
            const bd = row.invoiceBreakdown || {};
            const baseFee = bd.baseFee || 0;
            const discount = bd.discountAmount || 0;
            const secDep = bd.securityDeposit || 0;
            const extraSite = bd.extraSiteCost || 0;
            const equip = bd.equipmentCost || 0;
            const specPower = bd.specialPowerFee || 0;

            const initialAmount = row.initialInvoiceAmount || 0;
            const amountPaid = row.amountPaid || 0;
            const qbLink = row.quickbooksInvoiceLink || '';
            const bipgmOwned = row.bipgmOwned ? 'Yes' : 'No';
            const estMonth = row.establishedMonth || '';
            const estYear = row.establishedYear || '';

            csvContent += `${this.escapeCsv(row.organizationName)},${this.escapeCsv(contactName)},${this.escapeCsv(row.email)},${this.escapeCsv(row.phone)},${this.escapeCsv(row.type)},${this.escapeCsv(row.status)},${invoiced},${baseFee},${discount},${bipgmOwned},${this.escapeCsv(estMonth)},${this.escapeCsv(estYear)},${secDep},${extraSite},${equip},${specPower},${initialAmount},${amountPaid},${this.escapeCsv(qbLink)}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vegfest_invoicing_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private escapeCsv(field: string): string {
        if (!field) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }
}
