export interface CreateInvoiceCommand {
  readonly name: string;
  readonly amount: number;
  readonly userId: string;
}
