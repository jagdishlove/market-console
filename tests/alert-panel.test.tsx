import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertPanel } from "@/components/dashboard/alert-panel";
import type { AlertRule } from "@/lib/schema";
import { idx } from "./helpers";

function mockApi(failPost: boolean) {
  const rules: AlertRule[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      if (failPost) return Response.json({ error: "Could not save the rule." }, { status: 503 });
      const r = { id: "srv-1", ...JSON.parse(init.body as string) } as AlertRule;
      rules.push(r);
      return Response.json(r, { status: 201 });
    }
    return Response.json(rules);
  }));
}

const setup = () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AlertPanel idx={idx} /></QueryClientProvider>);
  return userEvent.setup();
};

afterEach(() => vi.unstubAllGlobals());

describe("AlertPanel", () => {
  it("shows field errors and does not submit an invalid form", async () => {
    mockApi(false);
    const u = setup();
    await u.type(screen.getByLabelText("Rule name"), "ab");
    await u.type(screen.getByLabelText("Attainment below (%)"), "500");
    await u.click(screen.getByRole("button", { name: "Save rule" }));
    expect(await screen.findByText(/at least 3 characters/)).toBeInTheDocument();
    expect(screen.getByText(/must be ≤ 150/)).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([, i]) => i?.method === "POST")).toBe(false);
  });

  it("requires at least one threshold", async () => {
    mockApi(false);
    const u = setup();
    await u.type(screen.getByLabelText("Rule name"), "Valid name");
    await u.click(screen.getByRole("button", { name: "Save rule" }));
    expect(await screen.findByText("Set at least one threshold")).toBeInTheDocument();
  });

  it("adds a rule optimistically and keeps it on success", async () => {
    mockApi(false);
    const u = setup();
    await u.type(screen.getByLabelText("Rule name"), "Slow growth");
    await u.type(screen.getByLabelText("Growth below (%)"), "1.5");
    await u.click(screen.getByRole("button", { name: "Save rule" }));
    expect(await screen.findByText("Slow growth")).toBeInTheDocument();
    expect(await screen.findByText("Rule saved.")).toBeInTheDocument();
  });

  it("rolls the optimistic rule back when the server fails", async () => {
    mockApi(true);
    const u = setup();
    await u.type(screen.getByLabelText("Rule name"), "Doomed rule");
    await u.type(screen.getByLabelText("Growth below (%)"), "1");
    await u.click(screen.getByRole("button", { name: "Save rule" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the rule.");
    await waitFor(() => expect(screen.queryByText("Doomed rule")).not.toBeInTheDocument());
  });
});
