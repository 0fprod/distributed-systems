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

const onLoggedIn = mock();

async function renderFeature() {
  const { LoginUserFeature } = await import("./login-user.feature");
  const client = makeClient();
  await act(async () => {
    render(<LoginUserFeature onLoggedIn={onLoggedIn} />, { wrapper: makeWrapper(client) });
  });
}

test("renders email and password inputs with a sign in button", async () => {
  await renderFeature();

  expect(screen.getByLabelText("Email")).toBeDefined();
  expect(screen.getByLabelText("Password")).toBeDefined();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
});

test("calls onLoggedIn callback after successful login", async () => {
  requestMock.mockImplementation(() => httpOk(null));
  onLoggedIn.mockReset();

  await renderFeature();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => {
    expect(onLoggedIn).toHaveBeenCalledTimes(1);
  });
});

test("calls POST /login with correct payload", async () => {
  requestMock.mockImplementation(() => httpOk(null));

  await renderFeature();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => {
    const calls = requestMock.mock.calls;
    const postCall = calls.find((call) => (call[1] as RequestInit | undefined)?.method === "POST");
    expect(postCall).toBeDefined();
    expect(postCall![0]).toBe("/login");
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body).toEqual({ email: "jane@example.com", password: "secret123" });
  });
});

test("shows error message when login fails", async () => {
  requestMock.mockImplementation(() =>
    httpError(401, "Unauthorized", { message: "Invalid credentials" }),
  );

  await renderFeature();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Password"), "wrongpass");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => {
    expect(screen.getByText("Invalid credentials")).toBeDefined();
  });
});

test("disables the sign in button while the mutation is pending", async () => {
  requestMock.mockImplementation(() => new Promise(() => {}));

  await renderFeature();

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  await waitFor(() => {
    expect(
      (screen.getByRole("button", { name: "Signing in..." }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
