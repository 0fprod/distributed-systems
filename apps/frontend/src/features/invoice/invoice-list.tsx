import type { Invoice } from "@distributed-systems/shared";

const invoices: Invoice[] = [
  { id: 1, name: "Acme Corp", amount: 1200, status: "completed" },
  { id: 2, name: "Globex Inc", amount: 450, status: "inprogress" },
  { id: 3, name: "Initech Ltd", amount: 3000, status: "completed" },
  { id: 4, name: "Umbrella Co", amount: 750, status: "inprogress" },
];

export function InvoiceList() {
  return (
    <div>
      <h2>Invoices</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.id}</td>
              <td>{invoice.name}</td>
              <td>{invoice.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
