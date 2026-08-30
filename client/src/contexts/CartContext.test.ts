import { describe, expect, it } from "vitest";
import { getCartItemCount } from "./CartContext";

describe("cart context helpers", () => {
  it("returns zero for an empty cart", () => {
    expect(getCartItemCount(null)).toBe(0);
  });

  it("exposes the Shopify cart item count", () => {
    expect(getCartItemCount({ itemCount: 3 } as never)).toBe(3);
  });
});
