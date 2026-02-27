import { type Guid, InvoiceStatus } from "@distributed-systems/shared";

export class BackendInvoice {
  private constructor(
    private readonly _id: Guid,
    private readonly _userId: Guid,
    private readonly _name: string,
    private readonly _amount: number,
    private readonly _status: InvoiceStatus,
  ) {}
  static create(props: {
    id: Guid;
    userId: Guid;
    name: string;
    amount: number;
    status: InvoiceStatus;
  }): BackendInvoice {
    return new BackendInvoice(props.id, props.userId, props.name, props.amount, props.status);
  }

  belongsToUser(userId: Guid): boolean {
    return this._userId.equals(userId);
  }

  isNotFailed(): boolean {
    return this._status !== InvoiceStatus.FAILED;
  }

  get id(): Guid {
    return this._id;
  }

  get userId(): Guid {
    return this._userId;
  }

  get name(): string {
    return this._name;
  }

  get amount(): number {
    return this._amount;
  }

  get status(): InvoiceStatus {
    return this._status;
  }
}
