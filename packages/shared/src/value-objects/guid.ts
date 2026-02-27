// Value object wrapping a UUID string.
// Using a wrapper class rather than a plain `string` alias prevents accidental
// mixing of bare strings with typed identifiers across bounded context boundaries.
// The backend domain layer uses Guid for all aggregate IDs; the worker and HTTP
// presentation layers work with plain strings and convert at the boundary via
// Guid.fromString() / guid.value.
export class Guid {
  private constructor(private readonly _value: string) {}

  static create(): Guid {
    return new Guid(crypto.randomUUID());
  }

  static fromString(value: string): Guid {
    return new Guid(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Guid): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
