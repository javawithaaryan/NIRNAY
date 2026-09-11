import type {
  AiInterpretation,
  ContextConsistency,
  CueSource,
  CueStrength,
  ImageRelevance,
  InterpretationInputs,
  LaneObstruction,
} from "@/lib/ai/types";
import type { IncidentCategory } from "@/lib/scenario/types";

export const deterministicProviderName = "Deterministic demo fallback (no LLM connected)";
export const maxFallbackConfidence = 0.85;

const hazardLabels: Record<IncidentCategory, string> = {
  landslide: "LANDSLIDE",
  flooding: "FLOODING / WATER ON CARRIAGEWAY",
  "road-damage": "ROAD SURFACE DAMAGE",
  bridge: "BRIDGE / CULVERT ISSUE",
  blockage: "CARRIAGEWAY BLOCKAGE",
  other: "UNCLASSIFIED DISRUPTION",
};

const keywordRules: { pattern: RegExp; category: IncidentCategory; cue: string; topic: string }[] = [
  { pattern: /landslide|slope|boulder|rock|mud|debris|slide/i, category: "landslide", cue: "debris, rock or slope material described on the carriageway", topic: "landslide" },
  { pattern: /flood|water|submerg|river|overflow/i, category: "flooding", cue: "standing or flowing water described", topic: "flooding" },
  { pattern: /crack|crater|pothole|collapse|subsid|caved|damage/i, category: "road-damage", cue: "damaged or collapsed road surface described", topic: "road damage" },
  { pattern: /bridge|culvert|girder|span/i, category: "bridge", cue: "bridge or culvert structure mentioned", topic: "bridge" },
  { pattern: /halt|stopped|stuck|jam|block|no passage|both lanes|obstruct/i, category: "blockage", cue: "vehicles halted or passage obstructed", topic: "blockage" },
];

type Cue = AiInterpretation["cues"][number];

function cue(text: string, source: CueSource, strength: CueStrength): Cue {
  return { text, source, strength };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function interpretDeterministically(inputs: InterpretationInputs, producedAt: number): Omit<AiInterpretation, "id"> {
  const scores: Record<IncidentCategory, number> = { landslide: 0, flooding: 0, "road-damage": 0, bridge: 0, blockage: 0, other: 0 };
  const cues: Cue[] = [];
  const note = inputs.note ?? "";

  for (const rule of keywordRules) {
    if (rule.pattern.test(note)) {
      scores[rule.category] += 0.3;
      cues.push(cue(rule.cue, "note", "strong"));
    }
  }
  if (inputs.category) {
    scores[inputs.category] += 0.4;
    cues.push(cue(`reporter selected "${inputs.category.replace("-", " ")}"`, "category", "moderate"));
  }
  for (const item of inputs.context) {
    for (const rule of keywordRules) {
      if (rule.pattern.test(item.summary)) {
        scores[rule.category] += 0.1;
        cues.push(cue(`${item.kind.toLowerCase().replace("_", " ")} mentions ${rule.topic}-related conditions (${item.origin.toLowerCase()})`, "context", "weak"));
        break;
      }
    }
  }

  const photo = inputs.photo;
  const imageNotes: string[] = [];
  let relevance: ImageRelevance = "NOT_ASSESSED";
  if (photo.present) {
    imageNotes.push(`${photo.width} × ${photo.height} px, ${Math.round(photo.byteSize / 1024)} KB`);
    const stats = photo.stats;
    if (!stats) {
      relevance = "LOW";
      imageNotes.push("photo statistics could not be computed on this device");
    } else {
      const dark = stats.meanLuminance < 0.18;
      const bright = stats.meanLuminance > 0.88;
      const flat = stats.contrast < 0.07;
      const small = Math.max(photo.width, photo.height) < 640;
      if (dark) imageNotes.push("very dark frame — details may be lost");
      if (bright) imageNotes.push("over-exposed frame — details may be lost");
      if (flat) imageNotes.push("low contrast — little visible structure");
      if (small) imageNotes.push("low resolution");
      if (stats.earthToneShare >= 0.3) {
        cues.push(
          cue(
            `about ${Math.round(stats.earthToneShare * 100)}% of the frame is earth / rock toned — consistent with debris or exposed slope (colour statistics only)`,
            "photo",
            "weak",
          ),
        );
        scores.landslide += 0.1;
      }
      if (stats.greyShare >= 0.55) imageNotes.push("large uniform grey area — could be road surface, sky or haze");
      if (stats.greenShare >= 0.45) imageNotes.push("frame dominated by vegetation");
      const usable = !dark && !bright && !flat;
      relevance = usable && !small && (stats.earthToneShare >= 0.2 || stats.greyShare >= 0.25) ? "HIGH" : usable ? "MEDIUM" : "LOW";
      imageNotes.push(
        `brightness ${stats.meanLuminance.toFixed(2)} · contrast ${stats.contrast.toFixed(2)} · earth tones ${Math.round(stats.earthToneShare * 100)}% · grey ${Math.round(stats.greyShare * 100)}% · green ${Math.round(stats.greenShare * 100)}%`,
      );
    }
    imageNotes.push("fallback performs no object recognition — only brightness, contrast and colour distribution");
  } else {
    imageNotes.push("no photo available for this incident (seeded demo report)");
  }

  const ranked = (Object.keys(scores) as IncidentCategory[])
    .filter((key) => key !== "other" && scores[key] > 0)
    .sort((a, b) => scores[b] - scores[a]);
  const total = ranked.reduce((sum, key) => sum + scores[key], 0);
  const topCategory = ranked[0] ?? null;
  const likelihood = topCategory ? round(Math.min(0.95, scores[topCategory] / Math.max(total, 0.6))) : 0;
  const alternatives = ranked.slice(1, 3).map((key) => ({ label: hazardLabels[key], likelihood: round(scores[key] / Math.max(total, 0.6)) }));

  let lane: LaneObstruction = "UNDETERMINED";
  let laneBasis = "extent of obstruction not stated in the evidence";
  if (/both lanes|no passage|fully|complete|entire|halted|blocked/i.test(note)) {
    lane = "FULL";
    laneBasis = "note describes both lanes or no passage";
  } else if (/one lane|single lane|partial|partly/i.test(note)) {
    lane = "PARTIAL";
    laneBasis = "note describes a single or partial lane";
  } else if (/passable|clear|open/i.test(note)) {
    lane = "NONE";
    laneBasis = "note suggests the carriageway is passable";
  } else if (topCategory === "landslide" || topCategory === "flooding") {
    laneBasis = "hazard type usually obstructs traffic, but the extent is not stated";
  }

  const kinds = new Set(inputs.context.map((item) => item.kind));
  const consistencyNotes: string[] = [];
  let consistency: ContextConsistency = "NO_CONTEXT";
  if (kinds.size > 0) {
    let supporting = 0;
    if (kinds.has("SECOND_REPORT")) {
      supporting += 1;
      consistencyNotes.push("a second, independent report describes a similar obstruction");
    }
    if (kinds.has("NEARBY_REPORT")) {
      supporting += 1;
      consistencyNotes.push("a nearby report from another device falls within the spatial and time window");
    }
    if (kinds.has("LOGISTICS")) {
      supporting += 1;
      consistencyNotes.push("transport operators report halted movement on the approach");
    }
    if (kinds.has("NETWORK_RECORD")) consistencyNotes.push("no prior closure was recorded for this segment - the obstruction is new");
    if (kinds.has("WEATHER")) {
      if (topCategory === "landslide" || topCategory === "flooding") {
        supporting += 1;
        consistencyNotes.push("weather context (heavy rainfall) is consistent with this hazard type");
      } else {
        consistencyNotes.push("weather context does not specifically support this hazard type");
      }
    }
    if (kinds.has("INSTITUTIONAL")) {
      supporting += 1;
      consistencyNotes.push("an institutional alert covers the district; it does not confirm this specific closure");
    }
    if (kinds.has("HISTORICAL")) consistencyNotes.push("historical record shows recurrent slope failures on this stretch");
    consistency = supporting >= 2 ? "CONSISTENT" : supporting === 1 ? "PARTIAL" : "INCONSISTENT";
  } else {
    consistencyNotes.push("no contextual evidence attached yet");
  }

  let confidence = 0.25;
  if (cues.some((item) => item.source === "note" && item.strength === "strong")) confidence += 0.2;
  if (inputs.category && inputs.category === topCategory) confidence += 0.15;
  if (relevance === "HIGH") confidence += 0.15;
  else if (relevance === "MEDIUM") confidence += 0.08;
  if (consistency === "CONSISTENT") confidence += 0.15;
  else if (consistency === "PARTIAL") confidence += 0.08;
  if (!topCategory) confidence = 0.2;
  confidence = round(Math.min(maxFallbackConfidence, confidence));

  const hazardLabel = topCategory ? hazardLabels[topCategory] : "HAZARD TYPE UNDETERMINED";
  const summary = topCategory
    ? `${hazardLabel.charAt(0)}${hazardLabel.slice(1).toLowerCase()} indicated on ${inputs.segmentName} (${inputs.corridor}) from ${describeInputs(inputs)}. Lane obstruction ${lane.toLowerCase()}; contextual evidence ${consistency.toLowerCase().replace("_", " ")}. Confidence ${confidence.toFixed(2)} — assistive signal only.`
    : `The submitted evidence for ${inputs.segmentName} does not contain enough structured cues to indicate a hazard type. Officer review required.`;

  return {
    incidentId: inputs.incidentId,
    producedAt,
    provider: { name: deterministicProviderName, kind: "deterministic-fallback", model: null },
    inputFingerprint: "",
    inputsUsed: { photo: photo.present, note: note.trim().length > 0, category: inputs.category, contextKinds: [...kinds] },
    hazard: { label: hazardLabel, category: topCategory, likelihood, alternatives },
    cues,
    laneObstruction: { assessment: lane, basis: laneBasis },
    imageQuality: { relevance, notes: imageNotes },
    consistency: { assessment: consistency, notes: consistencyNotes },
    confidence,
    summary,
    limitations: [
      "Keyword and colour-statistic heuristics only; no vision model or language model was used.",
      `Confidence is capped at ${maxFallbackConfidence.toFixed(2)} for the fallback provider.`,
      "Interpretation reflects the submitted evidence, not ground truth.",
    ],
  };
}

function describeInputs(inputs: InterpretationInputs): string {
  const parts: string[] = [];
  if (inputs.photo.present) parts.push("the field photo");
  if (inputs.note) parts.push("the reporter's note");
  if (inputs.category) parts.push("the selected type");
  if (inputs.context.length) parts.push(`${inputs.context.length} contextual evidence item${inputs.context.length > 1 ? "s" : ""}`);
  return parts.length ? parts.join(", ") : "limited evidence";
}
