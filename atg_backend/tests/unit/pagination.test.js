import { describe, it, expect } from "vitest";

const { parsePagination, paginated, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } = await import(
  "../../utils/pagination.js"
);

describe("parsePagination", () => {
  // Callers that never opted in — the dashboards, the CSV exports — must keep
  // receiving every row, so an absent page/pageSize means "no pagination".
  it("returns null when neither page nor pageSize is present", () => {
    expect(parsePagination({})).toBeNull();
    expect(parsePagination({ staffId: "3" })).toBeNull();
    expect(parsePagination({ page: "", pageSize: "" })).toBeNull();
  });

  it("defaults the page size when only a page is given", () => {
    expect(parsePagination({ page: "2" })).toEqual({
      page: 2,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: DEFAULT_PAGE_SIZE,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it("computes skip from page and pageSize", () => {
    expect(parsePagination({ page: "3", pageSize: "10" })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });

  // The whole point of the cap: a client must not be able to ask for the table.
  it("clamps pageSize to the maximum", () => {
    const result = parsePagination({ page: "1", pageSize: "100000" });
    expect(result.pageSize).toBe(MAX_PAGE_SIZE);
    expect(result.take).toBe(MAX_PAGE_SIZE);
  });

  it("falls back to sane values for garbage input", () => {
    expect(parsePagination({ page: "-4", pageSize: "abc" })).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
    expect(parsePagination({ page: "0", pageSize: "0" }).page).toBe(1);
  });
});

describe("paginated", () => {
  it("reports the filter total, not the page length", () => {
    const rows = [1, 2, 3];
    expect(paginated(rows, 812, { page: 2, pageSize: 3, skip: 3, take: 3 })).toEqual({
      data: rows,
      total: 812,
      page: 2,
      pageSize: 3,
      totalPages: 271,
    });
  });

  it("describes an unpaginated result as one full page", () => {
    const rows = [1, 2, 3];
    expect(paginated(rows, 3, null)).toEqual({
      data: rows,
      total: 3,
      page: 1,
      pageSize: 3,
      totalPages: 1,
    });
  });

  it("never reports zero pages for an empty result", () => {
    expect(paginated([], 0, { page: 1, pageSize: 25, skip: 0, take: 25 }).totalPages).toBe(1);
  });
});
