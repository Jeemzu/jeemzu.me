import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completeGddCheckpoint,
  type GddAssistantRequest,
} from "./gddAssistantApi";
import { authFetch } from "./authFetch";

vi.mock("./authFetch", () => ({ authFetch: vi.fn() }));
const request: GddAssistantRequest = {
  checkpoint: "concept",
  prompt: "A tiny exploration game",
  document: "Draft",
  history: [],
  references: [],
};
afterEach(() => vi.resetAllMocks());

describe("GDD assistant API", () => {
  it("uses authenticated, cancellable requests and validates the response", async () => {
    vi.mocked(authFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Let's refine the concept.",
          questions: [],
          referenceRequests: [],
          proposal: { title: "Game", introduction: "", sections: [] },
        }),
      ),
    );
    const controller = new AbortController();
    expect(
      (await completeGddCheckpoint(request, 0, controller.signal)).proposal
        .title,
    ).toBe("Game");
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining("/gdd-assistant"),
      expect.objectContaining({
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify(request),
      }),
    );
  });
  it.each([401, 403, 413, 429, 502])(
    "surfaces HTTP %i without a success-shaped fallback",
    async (status) => {
      vi.mocked(authFetch).mockResolvedValue(new Response("", { status }));
      await expect(
        completeGddCheckpoint(request, 0, new AbortController().signal),
      ).rejects.toThrow();
    },
  );
  it("rejects cross-checkpoint responses", async () => {
    vi.mocked(authFetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Ready",
          questions: [],
          referenceRequests: [],
          proposal: {
            title: "",
            introduction: "",
            sections: [
              {
                title: "Core gameplay",
                items: [{ heading: "Loop", body: "Explore" }],
              },
            ],
          },
        }),
      ),
    );
    await expect(
      completeGddCheckpoint(request, 0, new AbortController().signal),
    ).rejects.toThrow("outside");
  });
});
