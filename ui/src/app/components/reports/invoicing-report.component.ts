import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../services/storage.service';

@Component({
    selector: 'app-invoicing-report',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './invoicing-report.component.html',
    styleUrls: ['./invoicing-report.component.scss']
})
export class InvoicingReportComponent implements OnInit {
    private storageService = inject(StorageService);

    loading = true;
    error = '';
    reportData: any[] = [];
    today = new Date();

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
        if (this.reportData.length === 0) return;

        let csvContent = 'Organization Name,Contact Name,Email,Phone,Type,Status,Invoiced,Initial Invoice Amount,Amount Paid,Quickbooks Invoice Link\n';

        this.reportData.forEach(row => {
            const contactName = `${row.firstName} ${row.lastName}`;
            const invoiced = row.invoiced ? 'Yes' : 'No';
            const initialAmount = row.initialInvoiceAmount || 0;
            const amountPaid = row.amountPaid || 0;
            const qbLink = row.quickbooksInvoiceLink || '';

            csvContent += `${this.escapeCsv(row.organizationName)},${this.escapeCsv(contactName)},${this.escapeCsv(row.email)},${this.escapeCsv(row.phone)},${this.escapeCsv(row.type)},${this.escapeCsv(row.status)},${invoiced},${initialAmount},${amountPaid},${this.escapeCsv(qbLink)}\n`;
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
