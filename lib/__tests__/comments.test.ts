import { addComment, getListComments } from "@/lib/comments";
import { getBlockedIds } from "@/lib/moderation";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/moderation", () => ({ getBlockedIds: jest.fn() }));

// A chainable query-mockBuilder stub whose terminal `.order()` / `.single()` resolve
// to the value we queue per test. `mock`-prefixed so jest.mock can hoist it.
const mockBuilder: Record<string, jest.Mock> = {};
const mockFrom = jest.fn(() => mockBuilder);
jest.mock("@/lib/supabase", () => ({ supabase: { from: () => mockFrom() } }));

const mockBlocked = getBlockedIds as jest.MockedFunction<typeof getBlockedIds>;

const author = (over: Partial<{ display_name: string; username: string; avatar_url: string }> = {}) => ({
  display_name: "Maya",
  username: "maya",
  avatar_url: null,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBlocked.mockResolvedValue([]);
  mockBuilder.select = jest.fn(() => mockBuilder);
  mockBuilder.eq = jest.fn(() => mockBuilder);
  mockBuilder.insert = jest.fn(() => mockBuilder);
  mockBuilder.delete = jest.fn(() => mockBuilder);
  mockBuilder.order = jest.fn(() => mockBuilder);
  mockBuilder.single = jest.fn(() => mockBuilder);
});

describe("getListComments", () => {
  it("maps rows to the flat author shape, oldest first", async () => {
    mockBuilder.order = jest.fn().mockResolvedValue({
      data: [
        { id: "c1", body: "Nice list", created_at: "t1", author_id: "u1", author: author() },
      ],
      error: null,
    });

    const out = await getListComments("l1", "viewer");

    expect(out).toEqual([
      { id: "c1", body: "Nice list", createdAt: "t1", authorId: "u1", authorName: "Maya", authorUsername: "maya", authorAvatarUrl: null },
    ]);
  });

  it("drops comments from blocked authors", async () => {
    mockBlocked.mockResolvedValue(["blocked-user"]);
    mockBuilder.order = jest.fn().mockResolvedValue({
      data: [
        { id: "c1", body: "hi", created_at: "t1", author_id: "u1", author: author() },
        { id: "c2", body: "spam", created_at: "t2", author_id: "blocked-user", author: author({ username: "troll" }) },
      ],
      error: null,
    });

    const out = await getListComments("l1", "viewer");
    expect(out.map((c) => c.id)).toEqual(["c1"]);
  });

  it("throws when the query errors", async () => {
    mockBuilder.order = jest.fn().mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(getListComments("l1", "viewer")).rejects.toThrow("boom");
  });
});

describe("addComment", () => {
  it("rejects an empty body without hitting the network", async () => {
    await expect(addComment("l1", "u1", "   ")).rejects.toThrow("empty");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("trims the body and returns the created comment", async () => {
    mockBuilder.single = jest.fn().mockResolvedValue({
      data: { id: "c9", body: "Great picks", created_at: "t", author_id: "u1", author: author() },
      error: null,
    });

    const created = await addComment("l1", "u1", "  Great picks  ");

    expect(mockBuilder.insert).toHaveBeenCalledWith({ list_id: "l1", author_id: "u1", body: "Great picks" });
    expect(created).toMatchObject({ id: "c9", body: "Great picks", authorName: "Maya" });
  });
});
