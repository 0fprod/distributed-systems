// Command carrying the identity of the invoice to process.
// The worker has no read-side query; it only needs the ID to look up
// and update the record in the write model.
export interface ProcessInvoiceCommand {
  readonly invoiceId: number;
  readonly userId: number;
}
