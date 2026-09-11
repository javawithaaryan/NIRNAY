import type { AiAssessment, IncidentCategory } from "@/lib/scenario/types";

const labels: Record<IncidentCategory, string> = {
  landslide: "LANDSLIDE INDICATED",
  flooding: "FLOODING INDICATED",
  "road-damage": "ROAD DAMAGE INDICATED",
  bridge: "BRIDGE ISSUE INDICATED",
  blockage: "CARRIAGEWAY BLOCKAGE INDICATED",
  other: "DISRUPTION INDICATED — TYPE UNDETERMINED",
};

const keywordRules: { pattern: RegExp; category: IncidentCategory; indicator: string }[] = [
  { pattern: /landslide|slope|boulder|rock|mud|debris/i, category: "landslide", indicator: "debris or slope material reported on carriageway" },
  { pattern: /flood|water|submerg|river/i, category: "flooding", indicator: "standing or flowing water reported" },
  { pattern: /crack|crater|pothole|collapse|subsid|damage/i, category: "road-damage", indicator: "damaged road surface reported" },
  { pattern: /bridge|culvert|girder/i, category: "bridge", indicator: "bridge or culvert structure mentioned" },
  { pattern: /halt|stopped|stuck|jam|block|no passage|both lanes/i, category: "blockage", indicator: "vehicles halted / passage obstructed" },
];

export function assessIncidentFallback(category: IncidentCategory | null, note: string | null): AiAssessment {
  const indicators: string[] = [];
  let categoryGuess: IncidentCategory | null = category;
  const text = note ?? "";
  for (const rule of keywordRules) {
    if (rule.pattern.test(text)) {
      indicators.push(rule.indicator);
      if (!categoryGuess) categoryGuess = rule.category;
    }
  }
  if (category) indicators.unshift(`reporter selected type: ${category.replace("-", " ")}`);
  if (indicators.length === 0) indicators.push("no structured indicators extracted from the submission");
  const resolved = categoryGuess ?? "other";
  return {
    label: labels[resolved],
    indicators,
    categoryGuess: resolved,
    provider: "Deterministic demo fallback (no LLM connected)",
    caveat: "Assessment signal only. It does not verify the incident and does not change any road state.",
  };
}
