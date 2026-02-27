import type { Guid } from "@distributed-systems/shared";

export class BackendUser {
  private constructor(
    private readonly _id: Guid,
    private readonly _name: string,
    private readonly _email: string,
    private readonly _passwordHash: string,
  ) {}

  static create(props: {
    id: Guid;
    name: string;
    email: string;
    passwordHash: string;
  }): BackendUser {
    return new BackendUser(props.id, props.name, props.email, props.passwordHash);
  }

  get id(): Guid {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }
}
