import {
  extractLocationHint,
  fetchSharedList,
  listNameFromFile,
  parseTakeoutCsv,
  resolveRows,
  type ImportRow,
} from "@/lib/import-list";
import { fetchDetails, resolvePlaceId, type Spot } from "@/lib/places-search";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/places-search", () => ({
  resolvePlaceId: jest.fn(),
  fetchDetails: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke: jest.fn() } } }));

const mockResolve = resolvePlaceId as jest.MockedFunction<typeof resolvePlaceId>;
const mockDetails = fetchDetails as jest.MockedFunction<typeof fetchDetails>;
const mockInvoke = (supabase as unknown as { functions: { invoke: jest.Mock } }).functions.invoke;

const spot = (id: string): Spot => ({ id, name: `Place ${id}`, address: "somewhere", latitude: 1, longitude: 2 });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("parseTakeoutCsv", () => {
  it("parses standard Title/Note/URL columns", () => {
    const csv = "Title,Note,URL\nTartine Bakery,best morning bun,https://maps.google.com/?cid=1\n";
    expect(parseTakeoutCsv(csv)).toEqual([
      { title: "Tartine Bakery", note: "best morning bun", url: "https://maps.google.com/?cid=1" },
    ]);
  });

  it("handles quoted fields with embedded commas and newlines", () => {
    const csv = 'Title,Note,URL\n"Zuni Cafe","great patio, roast chicken\ngo hungry","https://maps.app.goo.gl/x"\n';
    const rows = parseTakeoutCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Zuni Cafe");
    expect(rows[0].note).toContain("roast chicken");
    expect(rows[0].note).toContain("go hungry");
  });

  it("accepts column-name variants (Name/Comment/Link)", () => {
    const csv = "Name,Comment,Link\nDolores Park,,https://x\n";
    expect(parseTakeoutCsv(csv)[0]).toEqual({ title: "Dolores Park", note: "", url: "https://x" });
  });

  it("drops rows without a title", () => {
    const csv = "Title,Note,URL\n,orphan note,https://x\nReal Place,,https://y\n";
    const rows = parseTakeoutCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Real Place");
  });

  it("returns an empty array for an empty file", () => {
    expect(parseTakeoutCsv("")).toEqual([]);
  });
});

describe("extractLocationHint", () => {
  it("reads @lat,lng from a Maps URL", () => {
    expect(extractLocationHint("https://www.google.com/maps/place/X/@45.52,-122.68,17z")).toEqual({
      latitude: 45.52,
      longitude: -122.68,
    });
  });

  it("reads the !3d!4d form", () => {
    expect(extractLocationHint("https://www.google.com/maps/place/data=!3d45.5!4d-122.6")).toEqual({
      latitude: 45.5,
      longitude: -122.6,
    });
  });

  it("returns null when no coordinates are present", () => {
    expect(extractLocationHint("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(extractLocationHint("")).toBeNull();
  });
});

describe("listNameFromFile", () => {
  it("strips the extension and tidies separators", () => {
    expect(listNameFromFile("Want_to_go.csv")).toBe("Want to go");
    expect(listNameFromFile("favorite-spots.CSV")).toBe("favorite spots");
  });
});

describe("resolveRows", () => {
  const rows: ImportRow[] = [
    { title: "A", note: "", url: "" },
    { title: "B", note: "", url: "" },
    { title: "C", note: "", url: "" },
  ];

  it("matches rows that resolve to a place, in input order", async () => {
    mockResolve.mockImplementation(async (q) => (q === "B" ? null : `pid-${q}`));
    mockDetails.mockImplementation(async (pid) => spot(pid));

    const out = await resolveRows(rows, undefined, 2);

    expect(out.map((r) => r.status)).toEqual(["matched", "unmatched", "matched"]);
    expect(out[0]).toMatchObject({ status: "matched", spot: { id: "pid-A" } });
    expect(out[1]).toMatchObject({ status: "unmatched", row: { title: "B" } });
  });

  it("treats a resolve/details error as unmatched", async () => {
    mockResolve.mockRejectedValue(new Error("network"));
    const out = await resolveRows(rows);
    expect(out.every((r) => r.status === "unmatched")).toBe(true);
  });

  it("reports progress for every row", async () => {
    mockResolve.mockResolvedValue("pid");
    mockDetails.mockResolvedValue(spot("pid"));
    const progress: number[] = [];
    await resolveRows(rows, (done, total) => progress.push(done) || expect(total).toBe(3));
    expect(progress.sort()).toEqual([1, 2, 3]);
  });
});

describe("fetchSharedList", () => {
  it("uses the scraper's placeId + coordinates directly, without a Places lookup", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        listName: "Taipei Food",
        places: [{ name: "Nonsense Cafe", address: "Wuchang St", latitude: 25.04, longitude: 121.5, placeId: "ChIJ_abc" }],
      },
      error: null,
    });

    const { rows, listName } = await fetchSharedList("https://maps.app.goo.gl/x");

    expect(listName).toBe("Taipei Food");
    expect(rows[0]).toMatchObject({
      status: "matched",
      spot: { id: "ChIJ_abc", name: "Nonsense Cafe", latitude: 25.04, longitude: 121.5 },
    });
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockDetails).not.toHaveBeenCalled();
  });

  it("falls back to resolving by name + coords when a place has no placeId", async () => {
    mockInvoke.mockResolvedValue({
      data: { places: [{ name: "Taiwan Buffet", address: "", latitude: 25.0, longitude: 121.5, placeId: null }] },
      error: null,
    });
    mockResolve.mockResolvedValue("pid-resolved");
    mockDetails.mockResolvedValue(spot("pid-resolved"));

    const { rows } = await fetchSharedList("https://maps.app.goo.gl/x");

    expect(mockResolve).toHaveBeenCalledWith("Taiwan Buffet", { latitude: 25.0, longitude: 121.5 });
    expect(rows[0]).toMatchObject({ status: "matched", spot: { id: "pid-resolved" } });
  });

  it("marks a place unmatched when it has no placeId and can't be resolved", async () => {
    mockInvoke.mockResolvedValue({
      data: { places: [{ name: "Mystery Spot", address: "", latitude: null, longitude: null, placeId: null }] },
      error: null,
    });
    mockResolve.mockResolvedValue(null);

    const { rows } = await fetchSharedList("https://maps.app.goo.gl/x");
    expect(rows[0]).toMatchObject({ status: "unmatched", row: { title: "Mystery Spot" } });
  });

  it("surfaces the server's error body from a FunctionsHttpError (not the generic message)", async () => {
    // supabase-js sets a generic message and stashes the real body on `.context`.
    const httpErr = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: { json: async () => ({ error: "Missing APIFY_TOKEN secret." }) },
    });
    mockInvoke.mockResolvedValue({ data: null, error: httpErr });
    await expect(fetchSharedList("https://maps.app.goo.gl/x")).rejects.toThrow("Missing APIFY_TOKEN");
  });

  it("includes the server detail when present", async () => {
    const httpErr = Object.assign(new Error("non-2xx"), {
      context: { json: async () => ({ error: "Couldn't read that list.", detail: "apify 402" }) },
    });
    mockInvoke.mockResolvedValue({ data: null, error: httpErr });
    await expect(fetchSharedList("https://maps.app.goo.gl/x")).rejects.toThrow("apify 402");
  });

  it("reports rawCount 0 when the scraper returns no places", async () => {
    mockInvoke.mockResolvedValue({ data: { places: [], listName: null, rawCount: 0 }, error: null });
    const { rows, rawCount } = await fetchSharedList("https://maps.app.goo.gl/x");
    expect(rows).toHaveLength(0);
    expect(rawCount).toBe(0);
  });
});
