// Command: an immutable data structure that expresses the intent to create an invoice.
// Commands are named in the imperative ("CreateInvoice") and carry only the
// data needed to execute the use case — no domain objects, no IDs yet.
export interface CreateInvoiceCommand {
  readonly name: string;
  readonly amount: number;
}
