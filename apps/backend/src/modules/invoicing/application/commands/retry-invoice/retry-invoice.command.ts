export interface RetryInvoiceCommand {
  readonly invoiceId: string;
  readonly userId: string;
  readonly name: string;
  readonly amount: number;
}
