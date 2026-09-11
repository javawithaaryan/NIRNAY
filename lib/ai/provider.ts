import { deterministicProviderName, interpretDeterministically } from "@/lib/ai/deterministic";
import type { AiInterpretation, InterpretationInputs } from "@/lib/ai/types";

export type AiInterpretationProvider = {
  readonly name: string;
  readonly kind: AiInterpretation["provider"]["kind"];
  interpret(inputs: InterpretationInputs, photo: Blob | null, producedAt: number): Promise<Omit<AiInterpretation, "id">>;
};

export const deterministicProvider: AiInterpretationProvider = {
  name: deterministicProviderName,
  kind: "deterministic-fallback",
  async interpret(inputs, _photo, producedAt) {
    return interpretDeterministically(inputs, producedAt);
  },
};

const requestTimeoutMs = 30_000;

export function createBackendProvider(endpoint: string): AiInterpretationProvider {
  return {
    name: "Backend LLM adapter",
    kind: "llm-backend",
    async interpret(inputs, photo, producedAt) {
      const form = new FormData();
      form.append("inputs", JSON.stringify(inputs));
      if (photo) form.append("photo", photo, `${inputs.reference}.jpg`);
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetch(endpoint, { method: "POST", body: form, signal: controller.signal });
        if (!response.ok) throw new Error(`AI adapter returned HTTP ${response.status}`);
        const body = (await response.json()) as Partial<Omit<AiInterpretation, "id">>;
        if (!body.hazard || !body.summary || typeof body.confidence !== "number") throw new Error("AI adapter response is incomplete");
        return {
          ...interpretDeterministically(inputs, producedAt),
          ...body,
          incidentId: inputs.incidentId,
          producedAt,
          provider: { name: body.provider?.name ?? "Backend LLM adapter", kind: "llm-backend", model: body.provider?.model ?? null },
          confidence: Math.min(1, Math.max(0, body.confidence)),
        };
      } finally {
        window.clearTimeout(timer);
      }
    },
  };
}

function resolveProvider(): AiInterpretationProvider {
  const endpoint = process.env.NEXT_PUBLIC_AI_INTERPRETATION_ENDPOINT?.trim();
  return endpoint ? createBackendProvider(endpoint) : deterministicProvider;
}

export const aiProvider = resolveProvider();

export function fingerprintInputs(inputs: InterpretationInputs): string {
  const photoKey = inputs.photo.present ? `${inputs.photo.reportId}:${inputs.photo.byteSize}:${inputs.photo.stats ? "s" : "n"}` : "none";
  const contextKey = inputs.context
    .map((item) => `${item.kind}:${item.summary.length}`)
    .sort()
    .join("|");
  return [inputs.incidentId, inputs.category ?? "-", inputs.note ?? "", photoKey, contextKey].join("#");
}
