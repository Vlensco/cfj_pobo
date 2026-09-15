/** @vitest-environment happy-dom */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { productCatalog } from "@/data/catalog";

const addItem = vi.fn();

vi.mock("@/contexts/CartContext", () => ({ useCart: () => ({ addItem }) }));
vi.mock("wouter", () => ({ Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>, useRoute: () => [true, { slug: "junction-long-sleeve" }] }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    analytics: { trackEvent: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } },
    adminProducts: {
      getDetails: { useQuery: () => ({ data: undefined }) },
      list: { useQuery: () => ({ data: { products: [] } }) },
    },
  },
}));

import ProductPage from "../ProductPage";

describe("product add-to-bag feedback", () => {
  afterEach(() => { vi.useRealTimers(); addItem.mockClear(); });
  it("shows a brief pending state and locks product choices while adding", () => {
    vi.useFakeTimers();
    render(<ProductPage />);
    fireEvent.click(screen.getByRole("button", { name: /add to bag/i }));
    const pendingButton = screen.getByRole("button", { name: /adding to bag/i });
    expect((pendingButton as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Select Chalk" }) as HTMLButtonElement).disabled).toBe(true);
    act(() => { vi.advanceTimersByTime(520); });
    expect(addItem).toHaveBeenCalledWith(productCatalog[0], "Ink", "M");
    expect((screen.getByRole("button", { name: /add to bag/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});
