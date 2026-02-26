import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, mock, test } from "bun:test";

import { httpError, httpOk } from "#test/http-helpers";
import { makeClient, makeWrapper } from "#test/query-helpers";

const requestMock = mock();

mock.module("#shared/request", () => ({
  request: requestMock,
}));

beforeEach(() => {
  requestMock.mockReset();
});

const onRegistered = mock();

async function renderFeature() {
  const { RegisterUserFeature } = await import("./register-user.feature");
  const client = makeClient();
  await act(async () => {
    render(<RegisterUserFeature onRegistered={onRegistered} />, { wrapper: makeWrapper(client) });
  });
}

test("renders name, email, and password inputs with a register button", async () => {
  await renderFeature();

  expect(screen.getByLabelText("Name")).toBeDefined();
  expect(screen.getByLabelText("Email")).toBeDefined();
  expect(screen.getByLabelText("Password")).toBeDefined();
  expect(screen.getByRole("button", { name: "Register" })).toBeDefined();
});

test("calls onRegistered callback after successful registration", async () => {
  requestMock.mockImplementation(() => httpOk(null, { status: 201 }));
  onRegistered.mockReset();

  await renderFeature();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "Jane Doe");
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Register" }));

  await waitFor(() => {
    expect(onRegistered).toHaveBeenCalledTimes(1);
  });
});

test("calls POST /register with correct payload", async () => {
  requestMock.mockImplementation(() => httpOk(null, { status: 201 }));

  await renderFeature();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "Jane Doe");
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Register" }));

  await waitFor(() => {
    const calls = requestMock.mock.calls;
    const postCall = calls.find((call) => (call[1] as RequestInit | undefined)?.method === "POST");
    expect(postCall).toBeDefined();
    expect(postCall![0]).toBe("/register");
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toEqual({ name: "Jane Doe", email: "jane@example.com", password: "secret123" });
  });
});

test("shows error message when registration fails", async () => {
  requestMock.mockImplementation(() =>
    httpError(409, "Conflict", { message: "Email already in use" }),
  );

  await renderFeature();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "Jane Doe");
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Register" }));

  await waitFor(() => {
    expect(screen.getByText("Email already in use")).toBeDefined();
  });
});

test("disables the register button while the mutation is pending", async () => {
  requestMock.mockImplementation(() => new Promise(() => {}));

  await renderFeature();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "Jane Doe");
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Register" }));

  await waitFor(() => {
    expect(
      (screen.getByRole("button", { name: "Registering..." }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
