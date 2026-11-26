import { describe, expect, it } from "vitest";
import { SIDEBAR_MENU } from "./menuNavigation";

describe("Opening Stock sidebar", () => {
  it("places Opening Stock immediately before All Receipts", () => {
    const stockReceive = SIDEBAR_MENU.find((item) => item.title === "Stock Receive");
    const titles = (stockReceive?.subItems || []).map((item) => item.title);
    expect(titles).toEqual([
      "Receive from Factory",
      "Receive from Depot",
      "Stock Return Receive",
      "Opening Stock",
      "All Receipts",
    ]);
    const opening = stockReceive?.subItems?.find((item) => item.title === "Opening Stock");
    expect(opening?.path).toBe("/receive/opening-stock");
  });
});
