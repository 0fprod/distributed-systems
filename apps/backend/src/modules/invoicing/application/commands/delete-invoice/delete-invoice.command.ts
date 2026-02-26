// Command: expresses the intent to permanently remove an invoice.
// Carries only the identifier and the caller's identity — no domain objects cross
// the application boundary. userId is required so the handler can enforce ownership:
// a user may only delete invoices they own.
export interface DeleteInvoiceCommand {
  readonly invoiceId: number;
  readonly userId: number;
}
