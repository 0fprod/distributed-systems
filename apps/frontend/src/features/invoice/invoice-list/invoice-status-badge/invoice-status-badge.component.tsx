import { InvoiceStatus } from "@distributed-systems/shared";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  [InvoiceStatus.PENDING]:
    "rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700",
  [InvoiceStatus.INPROGRESS]:
    "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700",
  [InvoiceStatus.COMPLETED]:
    "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700",
};

interface Props {
  status: InvoiceStatus;
}

export function InvoiceStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${STATUS_STYLES[status]}`}
      data-testid={`status-badge-${status}`}
    >
      {status === InvoiceStatus.INPROGRESS && (
        <svg
          aria-hidden="true"
          className="h-3 w-3 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
            fill="currentColor"
          />
        </svg>
      )}
      {status}
    </span>
  );
}
