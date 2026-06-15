import { describe, expect, it, vi, beforeEach } from "vitest";
import { MODEL_CONFIG, FALLBACK_MODEL } from "./ai.js";

const mockParse = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { parse: mockParse };
  },
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: "{}" } }],
        }),
      },
    };
  },
}));

describe("MODEL_CONFIG", () => {
  it("utilise Haiku pour le parsing Anthropic", () => {
    expect(MODEL_CONFIG.anthropic.parsing).toBe("claude-3-5-haiku-20241022");
  });

  it("utilise gpt-4o-mini pour le parsing OpenAI", () => {
    expect(MODEL_CONFIG.openai.parsing).toBe("gpt-4o-mini");
  });

  it("utilise un modèle plus puissant pour planning/advice", () => {
    expect(MODEL_CONFIG.anthropic.planning).not.toBe(MODEL_CONFIG.anthropic.parsing);
    expect(MODEL_CONFIG.anthropic.advice).not.toBe(MODEL_CONFIG.anthropic.parsing);
  });
});

describe("FALLBACK_MODEL", () => {
  it("fallback Anthropic est Sonnet", () => {
    expect(FALLBACK_MODEL.anthropic).toContain("sonnet");
  });

  it("fallback OpenAI est gpt-4o", () => {
    expect(FALLBACK_MODEL.openai).toContain("gpt-4o");
  });
});

describe("createPlanner – parseQuickAdd", () => {
  const FAKE_RESULT = {
    kind: "task" as const,
    title: "Test",
    date: "2026-06-16",
    start: null,
    end: null,
    location: null,
    people: [],
    context: "pro" as const,
    mode: "action" as const,
  };

  beforeEach(() => {
    mockParse.mockReset();
  });

  it("retourne le résultat quand le modèle léger réussit", async () => {
    mockParse.mockResolvedValueOnce({ parsed_output: FAKE_RESULT });

    const { createPlanner } = await import("./ai.js");
    const planner = createPlanner("anthropic", "fake-key");
    const result = await planner.parseQuickAdd("rdv dentiste mardi", "2026-06-16");

    expect(result).toEqual(FAKE_RESULT);
    expect(mockParse).toHaveBeenCalledTimes(1);
    expect(mockParse.mock.calls[0]![0]).toMatchObject({
      model: MODEL_CONFIG.anthropic.parsing,
    });
  });

  it("fallback Sonnet si Haiku échoue", async () => {
    mockParse
      .mockRejectedValueOnce(new Error("Haiku failed"))
      .mockResolvedValueOnce({ parsed_output: FAKE_RESULT });

    const { createPlanner } = await import("./ai.js");
    const planner = createPlanner("anthropic", "fake-key");
    const result = await planner.parseQuickAdd("rdv dentiste mardi", "2026-06-16");

    expect(result).toEqual(FAKE_RESULT);
    expect(mockParse).toHaveBeenCalledTimes(2);
    expect(mockParse.mock.calls[1]![0]).toMatchObject({
      model: FALLBACK_MODEL.anthropic,
    });
  });

  it("throw si les deux modèles échouent", async () => {
    mockParse
      .mockRejectedValueOnce(new Error("Haiku failed"))
      .mockResolvedValueOnce({ parsed_output: null });

    const { createPlanner } = await import("./ai.js");
    const planner = createPlanner("anthropic", "fake-key");

    await expect(
      planner.parseQuickAdd("texte", "2026-06-16"),
    ).rejects.toThrow("L'IA n'a pas pu structurer la phrase");
  });
});
