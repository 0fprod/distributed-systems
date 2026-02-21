import { render, screen } from "@testing-library/react";
import { expect, test } from "bun:test";

import { InvoiceStatus } from "@distributed-systems/shared";

import { InvoiceStatusBadge } from "./invoice-status-badge.component";

test("renders pending badge with correct label", () => {
  render(<InvoiceStatusBadge status={InvoiceStatus.PENDING} />);

  const badge = screen.getByTestId(`status-badge-${InvoiceStatus.PENDING}`);
  expect(badge).toBeDefined();
  expect(badge.textContent).toContain(InvoiceStatus.PENDING);
});

test("renders inprogress badge with correct label", () => {
  render(<InvoiceStatusBadge status={InvoiceStatus.INPROGRESS} />);

  const badge = screen.getByTestId(`status-badge-${InvoiceStatus.INPROGRESS}`);
  expect(badge).toBeDefined();
  expect(badge.textContent).toContain(InvoiceStatus.INPROGRESS);
});

test("renders completed badge with correct label", () => {
  render(<InvoiceStatusBadge status={InvoiceStatus.COMPLETED} />);

  const badge = screen.getByTestId(`status-badge-${InvoiceStatus.COMPLETED}`);
  expect(badge).toBeDefined();
  expect(badge.textContent).toContain(InvoiceStatus.COMPLETED);
});

test("pending badge does not carry blue or green classes", () => {
  render(<InvoiceStatusBadge status={InvoiceStatus.PENDING} />);

  const badge = screen.getByTestId(`status-badge-${InvoiceStatus.PENDING}`);
  expect(badge.className).not.toContain("blue");
  expect(badge.className).not.toContain("green");
});

test("inprogress badge does not carry green or yellow classes", () => {
  render(<InvoiceStatusBadge status={InvoiceStatus.INPROGRESS} />);

  const badge = screen.getByTestId(`status-badge-${InvoiceStatus.INPROGRESS}`);
  expect(badge.className).not.toContain("green");
  expect(badge.className).not.toContain("yellow");
});

test("completed badge does not carry blue or yellow classes", () => {
  render(<InvoiceStatusBadge status={InvoiceStatus.COMPLETED} />);

  const badge = screen.getByTestId(`status-badge-${InvoiceStatus.COMPLETED}`);
  expect(badge.className).not.toContain("blue");
  expect(badge.className).not.toContain("yellow");
});
