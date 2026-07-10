import {
  extractLocationHint,
  listNameFromFile,
  parseTakeoutCsv,
  resolveRows,
  type ImportRow,
} from "@/lib/import-list";
import { fetchDetails, resolvePlaceId, type Spot } from "@/lib/places-search";

jest.mock("@/lib/places-search", () => ({
  resolvePlaceId: jest.fn(),
  fetchDetails: jest.fn(),
}));

const mockResolve = resolvePlaceId as jest.MockedFunction<typeof resolvePlaceId>;
const mockDetails = fetchDetails as jest.MockedFunction<typeof fetchDetails>;

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
