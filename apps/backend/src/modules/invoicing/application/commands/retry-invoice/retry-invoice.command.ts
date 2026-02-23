// Command: expresses the intent to fix and re-queue a failed invoice.
// Carries only the data needed for the use case — no domain objects.
// The invoiceId identifies which invoice to retry; name and amount allow
// correcting the data that may have caused the original failure.
export interface RetryInvoiceCommand {
  readonly invoiceId: number;
  readonly name: string;
  readonly amount: number;
}
