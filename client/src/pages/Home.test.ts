import { describe, expect, it } from "vitest";
import { filterProducts, getProductFilters, getSelectedVariant } from "./Home";
import type { Product } from "@shared/commerce/types";

const product = (title: string, productType: string, tags: string[]): Product => ({
  id: title,
  handle: title.toLowerCase().replaceAll(" ", "-"),
  title,
  description: "",
  descriptionHtml: "",
  productType,
  vendor: "Manush Studio",
  tags,
  options: [],
  priceRange: { min: { amount: "10", currencyCode: "BDT" }, max: { amount: "10", currencyCode: "BDT" } },
  images: [],
  variants: [{ id: `${title}-variant`, title: "Default Title", availableForSale: true, price: { amount: "10", currencyCode: "BDT" }, compareAtPrice: null, selectedOptions: [] }],
});

describe("storefront catalog filters", () => {
  const products = [product("Tray", "Home Objects", ["Pastel", "Soft Blue"]), product("Throw", "Textiles", ["Pastel", "Blush Pink"])]

  it("derives unique category and tag filters from live products", () => {
    expect(getProductFilters(products)).toEqual(["All pieces", "Home Objects", "Pastel", "Soft Blue", "Textiles", "Blush Pink"]);
  });

  it("filters by product type or product tag", () => {
    expect(filterProducts(products, "Textiles").map(item => item.title)).toEqual(["Throw"]);
    expect(filterProducts(products, "Soft Blue").map(item => item.title)).toEqual(["Tray"]);
    expect(filterProducts(products, "All pieces")).toHaveLength(2);
  });

  it("selects the requested variant and falls back to the first variant", () => {
    const multiVariant = { ...products[0], variants: [products[0].variants[0], { ...products[0].variants[0], id: "second" }] };
    expect(getSelectedVariant(multiVariant, "second")?.id).toBe("second");
    expect(getSelectedVariant(multiVariant, "missing")?.id).toBe(products[0].variants[0].id);
  });
});
