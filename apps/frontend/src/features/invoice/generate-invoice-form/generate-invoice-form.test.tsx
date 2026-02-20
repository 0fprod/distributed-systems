import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, mock, test } from "bun:test";

import { GenerateInvoiceForm } from "./generate-invoice-form.component";

mock.module("./submit-invoice", () => ({
  submitInvoice: mock(() => Promise.resolve()),
}));

test("renders name and amount inputs", () => {
  render(<GenerateInvoiceForm />);

  expect(screen.getByLabelText("Name")).toBeDefined();
  expect(screen.getByLabelText("Amount")).toBeDefined();
  expect(screen.getByRole("button", { name: "Generate Invoice" })).toBeDefined();
});

test("submits the form with correct values and resets fields after submit", async () => {
  const user = userEvent.setup();
  render(<GenerateInvoiceForm />);

  await user.type(screen.getByLabelText("Name"), "Acme Corp");
  await user.type(screen.getByLabelText("Amount"), "1200");
  await user.click(screen.getByRole("button", { name: "Generate Invoice" }));

  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("");
});
