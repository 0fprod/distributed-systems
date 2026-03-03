import type { InvoiceFilters } from "#shared/query-keys";
import { useDebounce } from "#shared/use-debounce";

interface Props {
  filters: InvoiceFilters;
  onFilterChange: <K extends keyof InvoiceFilters>(key: K, value: InvoiceFilters[K]) => void;
}

export function InvoiceFilterBar({ filters, onFilterChange }: Props) {
  const [nameInput, setNameInput] = useDebounce(filters.name, (v) => onFilterChange("name", v));
  const [minInput, setMinInput] = useDebounce(filters.minAmount, (v) =>
    onFilterChange("minAmount", v),
  );
  const [maxInput, setMaxInput] = useDebounce(filters.maxAmount, (v) =>
    onFilterChange("maxAmount", v),
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="Search by name…"
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={filters.status}
        onChange={(e) => onFilterChange("status", e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="inprogress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
      </select>
      <input
        type="number"
        placeholder="Min amount"
        value={minInput}
        onChange={(e) => setMinInput(e.target.value)}
        className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="number"
        placeholder="Max amount"
        value={maxInput}
        onChange={(e) => setMaxInput(e.target.value)}
        className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
