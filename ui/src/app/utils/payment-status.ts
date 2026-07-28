// UI mirror of the server's "paid in full" rule (api/src/utils/payment-status.ts).
//
// Per the team's sign-off (Kelso), an exhibitor counts as paid in full when:
//   (1) they've been marked invoiced, AND
//   (2) their Amount Paid is at least their Initial Invoice Amount.
//
// The ">=" (not "==") is deliberate: some sponsors pay in full at registration
// so no invoice is sent, leaving a large Amount Paid against a $0 Initial
// Invoice Amount. This derivation replaces the manual "PAID" tag, so paid-in-
// full comes straight from the numbers already being entered and can't drift.

export function isPaidInFull(
  reg: { invoiced?: boolean; amountPaid?: number; initialInvoiceAmount?: number }
): boolean {
  if (!reg.invoiced) return false;
  return (reg.amountPaid || 0) >= (reg.initialInvoiceAmount || 0);
}
