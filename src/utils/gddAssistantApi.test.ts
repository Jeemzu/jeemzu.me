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
  it.each(["scratch", "fill"] as const)(
    "sends %s mode in authenticated, cancellable requests and validates the response",
    async (mode) => {
      const payload = { ...request, mode };
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
        (await completeGddCheckpoint(payload, 0, controller.signal)).proposal
          .title,
      ).toBe("Game");
      expect(authFetch).toHaveBeenCalledWith(
        expect.stringContaining("/gdd-assistant"),
        expect.objectContaining({
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify(payload),
        }),
      );
    },
  );
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
