// Command: expresses the intent to permanently remove an invoice.
// Carries only the identifier — no domain objects cross the application boundary.
export interface DeleteInvoiceCommand {
  readonly invoiceId: number;
}
