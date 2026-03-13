import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
    reports = [
        {
            id: 'electricity',
            title: 'Electricity Requirements',
            description: 'View participants who have requested electrical hookups, including power needs and descriptions.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 7-3 5h4l-3 5"></path><path d="M21 12h-4l-3-5h-4l-3 5H3"></path></svg>`
        },
        {
            id: 'invoicing',
            title: 'Invoicing Report',
            description: 'List of all approved participants with their invoiced status, payment amounts, and QuickBooks link.',
        },
        {
            id: 'rental-equipment',
            title: 'Rental Equipment',
            description: 'View participants who have requested rental equipment like tables, chairs, tents, or weights.',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10z"/><polygon points="2 10 22 10 18 2 6 2 2 10"/><line x1="12" y1="10" x2="12" y2="22"/><line x1="8" y1="10" x2="8" y2="22"/><line x1="16" y1="10" x2="16" y2="22"/></svg>`
        }
    ];
}
