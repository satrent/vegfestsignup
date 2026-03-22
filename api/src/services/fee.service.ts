import { DistanceService } from './distance.service';

export interface FeeCalculation {
    baseFee: number;
    discountAmount: number;
    discountNotes: string[];
    securityDeposit: number;
    extraSiteCost: number;
    equipmentCost: number;
    specialPowerFee: number;
    total: number;
    isOver100: boolean;
    calculationNotes: string;
}

export class FeeService {
    static async calculateRegistrationFees(r: any, skipDistanceCheck: boolean = false): Promise<FeeCalculation> {
        let isOver100 = r.travelingOver100Miles || false;
        let distanceNote = '';

        // Attempt to verify distance if address is present
        if (!skipDistanceCheck && r.address && r.city && r.state && r.zip) {
            // Rate limit: OpenStreetMap Nominatim requires 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1100));

            const distance = await DistanceService.getDistanceInMiles(r.address, r.city, r.state, r.zip);

            if (distance !== null) {
                isOver100 = distance >= 100;
                distanceNote = ` (Dist: ${distance.toFixed(1)} mi)`;
            }
        }

        // Calculate Base Fee from Organization Category
        let base = 200; // default for unknown
        if (r.organizationCategory) {
            const match = r.organizationCategory.match(/\$(\d+)/);
            if (match) {
                base = parseInt(match[1], 10);
            }
        }

        // Calculate BIPGM Start-up discount eligibility
        // Rule: BIPGM owned AND in business for less than 3 years by 9/20/2026.
        // Derive BIPGM status from bipgmOwned flag OR ownerDemographics selection.
        const bipgmDemographics = ['African or Black', 'Indigenous', 'Asian', 'Hispanic/Latinx', 'Other'];
        const isBipgmOwned = r.bipgmOwned ||
            (Array.isArray(r.ownerDemographics) && r.ownerDemographics.some((d: string) => bipgmDemographics.includes(d)));

        let startYear = parseInt(r.establishedYear || '0', 10);
        let isBipgmStartup = false;
        if (isBipgmOwned && startYear > 0) {
            if (startYear > 2023) {
                isBipgmStartup = true;
            } else if (startYear === 2023) {
                const monthMap: { [key: string]: number } = {
                    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
                    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
                };
                if (r.establishedMonth) {
                    const m = monthMap[r.establishedMonth.toLowerCase().trim()];
                    if (m !== undefined && m >= 8) { // September or later
                        isBipgmStartup = true;
                    }
                } else {
                    isBipgmStartup = true; // Assume eligible if only year is 2023
                }
            }
        }

        // Calculate Discounts (they do not stack, max 50% off base)
        let discountAmount = 0;
        let discountNotes: string[] = [];

        if (isBipgmStartup) {
            discountAmount = base * 0.5;
            discountNotes.push('BIPGM Start-up 50%');
        }
        if (isOver100) {
            if (discountAmount === 0) {
                discountAmount = base * 0.5;
                discountNotes.push('Distance 50%');
            } else {
                discountNotes.push('Distance limit reached (No Stack)');
            }
        }

        // Calculate Invoice Amount
        const securityDeposit = 200;
        const extraSiteCost = 0;
        const tablesCost = (r.numTables || 0) * 15;
        const chairsCost = (r.numChairs || 0) * 2;
        const tentsCost = (r.numTents || 0) * 200;
        const weightsCost = (r.numWeights || 0) * 25;
        const equipmentCost = tablesCost + chairsCost + tentsCost + weightsCost;

        // Electricity fee based on requested power level
        const powerFeeMap: { [key: string]: number } = { '5A': 60, '10A': 80, '15A': 100, '20A': 120 };
        const specialPowerFee = powerFeeMap[r.powerNeeds] || 0;

        const total = (base - discountAmount) + securityDeposit + extraSiteCost + equipmentCost + specialPowerFee;

        const startDate = (r.establishedMonth ? r.establishedMonth + ' ' : '') + (r.establishedYear || '');
        const eligibilityInfo = `[BIPGM: ${isBipgmOwned ? 'Yes' : 'No'}, Start: ${startDate || 'N/A'}]`;

        const baseStr = discountAmount > 0 ? `$${base - discountAmount} ($${base} - 50% ${discountNotes.join(', ')})` : `$${base}`;
        const specialPowerStr = specialPowerFee > 0 ? `, Electricity (${r.powerNeeds}): $${specialPowerFee}` : '';
        const calculationNotes = `Total: $${total} (Base: ${baseStr}, Security Deposit: $${securityDeposit}, Tables: $${tablesCost}, Chairs: $${chairsCost}, Tents: $${tentsCost}, Weights: $${weightsCost}${specialPowerStr})${distanceNote} ${eligibilityInfo}`;

        return {
            baseFee: base,
            discountAmount,
            discountNotes,
            securityDeposit,
            extraSiteCost,
            equipmentCost,
            specialPowerFee,
            total,
            isOver100,
            calculationNotes
        };
    }
}
