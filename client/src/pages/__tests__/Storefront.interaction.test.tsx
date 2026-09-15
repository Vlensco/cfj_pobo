/** @vitest-environment happy-dom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { productCatalog } from "@/data/catalog";

const cartItem = { key: "junction-ls-Ink-M", product: productCatalog[0], color: "Ink", size: "M", quantity: 1 };
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), useMutation: vi.fn() }));
vi.mock("@/contexts/CartContext", () => ({ useCart: () => ({ items: [cartItem], itemCount: 1, subtotal: 1888000, updateQuantity: vi.fn(), removeItem: vi.fn(), clearCart: vi.fn() }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    orderRequests: { create: { useMutation: mocks.useMutation } },
    adminProducts: { list: { useQuery: () => ({ data: { products: [] } }) } },
    stripe: {
      createCheckoutSession: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      getSessionStatus: { useQuery: () => ({ data: null, isLoading: false }) },
    },
    paddle: {
      createTransaction: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    crypto: {
      createInvoice: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    auth: {
      me: { useQuery: () => ({ data: { name: "Nadia", email: "nadia@example.com" } }) },
      loginCustomer: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      logout: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }),
  },
}));
vi.mock("wouter", () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
  useLocation: () => ["/shop", vi.fn()],
  useRoute: () => [false, {}],
}));
import { StoreShell } from "@/components/StoreShell";
import Shop from "../Shop";

function openRequestForm() {
  fireEvent.click(screen.getByRole("button", { name: /shopping bag with 1 items/i }));
  fireEvent.click(screen.getByRole("button", { name: /request these pieces/i }));
}

describe("storefront interactions", () => {
  beforeEach(() => {
    mocks.mutate.mockReset();
    mocks.useMutation.mockImplementation((handlers: { onSuccess: (data: { reference: string; subtotal: number }) => void }) => ({ mutate: (input: unknown) => { mocks.mutate(input); handlers.onSuccess({ reference: "TR-READY123", subtotal: 1888000 }); }, isPending: false }));
    window.history.replaceState(null, "", "/shop");
  });
  afterEach(() => { cleanup(); window.history.replaceState(null, "", "/shop"); });
  it("validates contact fields and lets customers return to their bag", () => {
    render(<StoreShell><div>Content</div></StoreShell>);
    openRequestForm();
    const form = screen.getByRole("button", { name: /send order request/i }).closest("form") as HTMLFormElement;
    expect(form.checkValidity()).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /back to bag/i }));
    expect(screen.getByRole("button", { name: /request these pieces/i })).toBeTruthy();
  });
  it("collects contact details and confirms a successful temporary order request", () => {
    render(<StoreShell><div>Content</div></StoreShell>);
    openRequestForm();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Nadia Pratama" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nadia@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+628123456789" } });
    fireEvent.change(screen.getByLabelText(/Notes/i), { target: { value: "Please contact after 5pm." } });
    fireEvent.click(screen.getByRole("button", { name: /send order request/i }));
    expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ customerName: "Nadia Pratama", email: "nadia@example.com", phone: "+628123456789", notes: "Please contact after 5pm.", items: [expect.objectContaining({ productId: "junction-ls", quantity: 1 })] }));
    expect(screen.getByText("Thanks for your request.")).toBeTruthy();
    expect(screen.getByText(/reference tr-ready123/i)).toBeTruthy();
  });
  it("updates catalog results across category, price, combined, and empty filters", () => { render(<Shop />); expect(screen.getByText("4 pieces in view")).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "The 90s Study" })); expect(screen.getByText("2 pieces in view")).toBeTruthy(); fireEvent.change(screen.getByLabelText("Price"), { target: { value: "2.5m-plus" } }); expect(screen.getByText("1 piece in view")).toBeTruthy(); expect(screen.getByText("Interval Track Jacket")).toBeTruthy(); fireEvent.change(screen.getByLabelText("Price"), { target: { value: "under-1m" } }); expect(screen.getByText("0 pieces in view")).toBeTruthy(); expect(screen.getByText("Try a different study.")).toBeTruthy(); });
  it("searches, sorts, and serializes the active discovery state into the URL", () => { render(<Shop />); fireEvent.change(screen.getByLabelText("Search the collection"), { target: { value: "jacket" } }); expect(screen.getByText("1 piece in view")).toBeTruthy(); expect(window.location.search).toBe("?q=jacket"); fireEvent.click(screen.getByRole("button", { name: "The 90s Study" })); fireEvent.change(screen.getByLabelText("Price"), { target: { value: "2.5m-plus" } }); fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "newest" } }); expect(window.location.search).toBe("?q=jacket&category=90s&price=2.5m-plus&sort=newest"); expect(screen.getByText("Interval Track Jacket")).toBeTruthy(); });
});
