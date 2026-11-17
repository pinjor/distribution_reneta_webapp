import { describe, expect, it } from "vitest";
import { getPageNumbers, paginate } from "./paginate";

describe("paginate", () => {
  it("slices the current page and reports visible range", () => {
    const data = [1, 2, 3, 4, 5, 6, 7];
    const result = paginate(data, 2, 3);
    expect(result.rows).toEqual([4, 5, 6]);
    expect(result.total).toBe(7);
    expect(result.page).toBe(2);
    expect(result.start).toBe(4);
    expect(result.end).toBe(6);
  });

  it("clamps an out-of-range page", () => {
    const result = paginate([1, 2, 3], 9, 2);
    expect(result.page).toBe(2);
    expect(result.rows).toEqual([3]);
  });

  it("handles empty data", () => {
    const result = paginate([], 1, 10);
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.start).toBe(0);
    expect(result.end).toBe(0);
    expect(result.pageCount).toBe(1);
  });
});

describe("getPageNumbers", () => {
  it("lists every page when there are few pages", () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("inserts ellipses for larger ranges", () => {
    expect(getPageNumbers(6, 13)).toContain("ellipsis");
    expect(getPageNumbers(6, 13)).toContain(1);
    expect(getPageNumbers(6, 13)).toContain(13);
    expect(getPageNumbers(6, 13)).toContain(6);
  });
});
