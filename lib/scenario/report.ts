import { synthesizeResponse } from "@/lib/ai/responseSynthesis";
import type { PortalState } from "@/lib/scenario/events";
import { formatStamp } from "@/lib/scenario/format";
import { buildIncidentIntelligence } from "@/lib/scenario/intelligence";
import { getPlace, getRoute, getSegment, scenarioMeta } from "@/lib/scenario/seed/nh29";
import type { PortalView } from "@/lib/scenario/view";

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

function section(title: string, body: string): string {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

function kv(rows: [string, unknown][]): string {
  return `<table class="kv">${rows.map(([key, value]) => `<tr><th>${esc(key)}</th><td>${esc(value)}</td></tr>`).join("")}</table>`;
}

function list(items: string[]): string {
  return items.length ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : "<p class=\"muted\">None</p>";
}

export function buildReportHtml(view: PortalView, state: PortalState, incidentId: string, generatedBy: string, generatedAt: number): string | null {
  const incidentView = view.incidents.find((item) => item.incident.id === incidentId);
  if (!incidentView) return null;
  const { incident, assessment, severity, evidence, interpretation, segment } = incidentView;
  const intel = buildIncidentIntelligence(view, incidentView, state);
  const seg = getSegment(incident.segmentId);

  const evidenceTable = `<table><thead><tr><th>Source</th><th>Origin</th><th>Time</th><th>Distance / relevance</th><th>Status</th><th>Contribution</th></tr></thead><tbody>${intel.rows
    .map(
      (row) =>
        `<tr><td>${esc(row.kindLabel)}<br><span class="muted">${esc(row.item.source)}</span></td><td>${esc(row.item.origin === "FIELD" ? "Field data" : row.item.origin === "SIMULATED" ? "SIMULATED / DEMO DATA" : "Seeded demo data")}</td><td>${esc(formatStamp(row.item.capturedAt))}</td><td>${esc(row.relevance)}</td><td>${esc(row.status)}</td><td>${esc(row.contribution)}</td></tr>`,
    )
    .join("")}</tbody></table>`;

  const missionsTable = `<table><thead><tr><th>Mission</th><th>Cargo</th><th>Vehicle</th><th>Priority</th><th>Impact (Mi)</th><th>Priority (P)</th><th>Deadline</th><th>Decision</th><th>Status</th></tr></thead><tbody>${view.missions
    .map((mission) => {
      const decision = mission.activeDecision;
      return `<tr><td>${esc(mission.mission.id)}</td><td>${esc(mission.mission.cargo)}</td><td>${esc(`${mission.vehicle.name} · ${mission.vehicle.vehicleClass} · ${mission.vehicle.grossTonnes} t`)}</td><td>${esc(mission.mission.priority)}</td><td>${esc(`${mission.impact.level} (${mission.impact.Mi.toFixed(2)})`)}</td><td>${esc(`${mission.priority.tier} (${mission.priority.P.toFixed(2)})`)}</td><td>${esc(formatStamp(mission.deadlineAt))}</td><td>${esc(decision ? `${decision.recommendation.action}${decision.recommendation.routeId ? ` via Route ${decision.recommendation.routeId}` : ""}${decision.recommendation.followUp.length ? ` + ${decision.recommendation.followUp.join(" / ")}` : ""}` : "CONTINUE")}</td><td>${esc(decision ? decision.status : "—")}</td></tr>`;
    })
    .join("")}</tbody></table>`;

  const routesTable = `<table><thead><tr><th>Route</th><th>Segments</th><th>State</th>${view.missions.map((mission) => `<th>${esc(mission.mission.id)} (${esc(mission.vehicle.vehicleClass)})</th>`).join("")}</tr></thead><tbody>${view.routes
    .map(
      (route) =>
        `<tr><td>${esc(`${route.route.name} · ${route.route.label}`)}<br><span class="muted">${esc(route.route.description)} · ${route.distanceKm} km · ${route.travelMin} min · demo-only simulated geometry</span></td><td>${esc(route.segments.map((item) => `${item.segment.name}: ${item.effectiveState}${item.segment.restriction?.maxVehicleClass ? ` (${item.segment.restriction.maxVehicleClass} only)` : ""}`).join("; "))}</td><td>${esc(route.worstState)}</td>${view.missions
          .map((mission) => {
            const evaluation = mission.evaluations.find((item) => item.routeId === route.route.id);
            return `<td>${esc(evaluation?.feasibility ?? "—")}${evaluation?.hardConstraintViolation ? "<br><span class=\"muted\">hard constraint</span>" : ""}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("")}</tbody></table>`;

  const decisionsHtml = view.decisions
    .filter((decision) => decision.createdAt >= incident.reportedAt - 1000)
    .map(
      (decision) =>
        `<div class="decision"><h3>${esc(`${decision.id} · ${decision.missionId} · ${decision.recommendation.action}${decision.recommendation.routeId ? ` via Route ${decision.recommendation.routeId}` : ""} · ${decision.status}`)}</h3>${kv([
          ["Feasibility", decision.recommendation.feasibility],
          ["Follow-up", decision.recommendation.followUp.join(" / ") || "—"],
          ["Staging / divert", decision.recommendation.stagingPlaceId ? getPlace(decision.recommendation.stagingPlaceId).name : decision.recommendation.divertPlaceId ? `Divert at ${getPlace(decision.recommendation.divertPlaceId).name}` : "—"],
          ["Recommended at", formatStamp(decision.createdAt)],
          ["Authority action", decision.actedBy ? `${decision.actedStatus ?? decision.status} by ${decision.actedBy.name} (${decision.actedBy.role}) at ${formatStamp(decision.actedAt ?? decision.createdAt)}` : "none"],
          ["Superseded", decision.supersededBy ? `by ${decision.supersededBy} at ${formatStamp(decision.supersededAt ?? 0)}` : "no"],
        ])}<p><strong>Why</strong></p>${list(decision.recommendation.why)}<p><strong>AI-assisted synthesis:</strong> ${esc(synthesizeResponse(view.missions.find((mission) => mission.mission.id === decision.missionId)!).narrative)}</p></div>`,
    )
    .join("");

  const instructionsHtml = view.instructions.length
    ? list(view.instructions.map((instruction) => `${instruction.id} · ${instruction.missionId} · ${instruction.text} · issued ${formatStamp(instruction.issuedAt)}${instruction.acknowledgedAt ? ` · acknowledged by ${instruction.acknowledgedBy} at ${formatStamp(instruction.acknowledgedAt)}` : " · not yet acknowledged"}`))
    : "<p class=\"muted\">No instruction issued.</p>";

  const auditHtml = `<table><thead><tr><th>Time</th><th>Actor</th><th>Event</th><th>Summary</th></tr></thead><tbody>${state.events
    .filter((event) => event.at >= incident.reportedAt - 1000)
    .map((event) => `<tr><td>${esc(formatStamp(event.at))}</td><td>${esc(`${event.actor.name} (${event.actor.role.toLowerCase()})`)}</td><td>${esc(event.payload.type)}</td><td>${esc(event.summary)}</td></tr>`)
    .join("")}</tbody></table>`;

  const body = [
    `<header><p class="tag">DEMO / SIMULATION — NIRNYAY Round-1 prototype report</p><h1>Incident report ${esc(incident.reference)}</h1><p class="muted">${esc(scenarioMeta.name)} · generated ${esc(formatStamp(generatedAt))} by ${esc(generatedBy)} · ${esc(scenarioMeta.basis)}</p></header>`,
    section("1. Incident", kv([
      ["Incident ID", `${incident.reference} (${incident.id})`],
      ["Location", `${seg.name} (${seg.corridor}) · ${incident.lat.toFixed(4)}° N, ${incident.lon.toFixed(4)}° E`],
      ["Reported", formatStamp(incident.reportedAt)],
      ["Reported type", incident.category],
      ["Reporter note", incident.note ?? "—"],
      ["Evidence status", assessment.status],
    ])),
    section("2. Field evidence", kv(evidence.filter((item) => item.kind === "FIELD_REPORT" || item.kind === "NEARBY_REPORT").flatMap((item) => [[item.title, `${item.source} · captured ${formatStamp(item.capturedAt)}${item.accuracyM ? ` · GPS ±${Math.round(item.accuracyM)} m` : ""}${item.photo?.kind === "field-db" ? " · photo stored on device" : " · no photo"} · ${item.summary}`]] as [string, unknown][]))),
    section("3. AI-assisted interpretation (assistive · not authoritative)", interpretation
      ? kv([
          ["Provider", interpretation.provider.name],
          ["Likely hazard", `${interpretation.hazard.label} (likelihood ${interpretation.hazard.likelihood.toFixed(2)})`],
          ["Cues", interpretation.cues.map((cue) => `${cue.text} [${cue.source}, ${cue.strength}]`).join("; ") || "none"],
          ["Lane obstruction", `${interpretation.laneObstruction.assessment} — ${interpretation.laneObstruction.basis}`],
          ["Image relevance / quality", `${interpretation.imageQuality.relevance} — ${interpretation.imageQuality.notes.join("; ")}`],
          ["Consistency with context", `${interpretation.consistency.assessment} — ${interpretation.consistency.notes.join("; ")}`],
          ["Confidence", interpretation.confidence.toFixed(2)],
          ["Summary", interpretation.summary],
          ["Limitations", interpretation.limitations.join(" ")],
          ["Guardrail", "AI interpretation does not verify the incident, does not change road state, does not select routes and cannot override hard constraints."],
        ])
      : "<p class=\"muted\">No AI interpretation recorded.</p>"),
    section("4. Corroborating sources", `${evidenceTable}<p class="muted">Sources marked SIMULATED / DEMO DATA are mocked for the prototype; no government, weather or logistics API is connected.</p>`),
    section("5. Evidence quality (verification support)", kv([
      ["E = 0.20 L + 0.20 T + 0.25 C + 0.20 S + 0.15 K", assessment.E.toFixed(2)],
      ["L location consistency", assessment.L.toFixed(2)],
      ["T freshness", `${assessment.T.toFixed(2)} (${intel.freshness})`],
      ["C corroboration", `${assessment.C.toFixed(2)} (${assessment.independentSources} independent sources)`],
      ["S source reliability", assessment.S.toFixed(2)],
      ["K contextual consistency", assessment.K.toFixed(2)],
      ["AI evidence synthesis", intel.synthesis],
    ])),
    section("6. Incident severity (operational seriousness — kept separate from evidence quality)", kv([
      ["D = 0.35 H + 0.20 A + 0.20 R + 0.25 X", `${severity.D.toFixed(2)} → ${intel.severityTier}`],
      ...intel.severityFactors.map((factor) => [`${factor.key} ${factor.label} (×${factor.weight})`, `${factor.value.toFixed(2)} — ${factor.why}`] as [string, unknown]),
    ])),
    section("7. Officer verification (official)", kv([
      ["Status", incident.verifiedAt ? "VERIFIED BY AUTHORIZED OFFICER" : incident.rejectedAt ? "REJECTED BY OFFICER" : "NOT VERIFIED"],
      ["Officer", incident.verifiedBy?.name ?? incident.rejectedBy?.name ?? "—"],
      ["Timestamp", incident.verifiedAt ? formatStamp(incident.verifiedAt) : incident.rejectedAt ? formatStamp(incident.rejectedAt) : "—"],
      ["Note", "AI analysis and corroboration informed the officer; they did not constitute verification."],
    ])),
    section("8. Affected road segment / network state", kv([
      ["Segment", `${seg.name} (${seg.corridor})`],
      ["Recorded state", segment ? segment.recordedState : "—"],
      ["Effective state", segment ? segment.effectiveState : "—"],
      ["Last verified", segment ? formatStamp(segment.runtime.lastVerifiedAt) : "—"],
      ["Reason", segment?.runtime.reason ?? "—"],
    ])),
    section("9. Affected missions", missionsTable),
    section("10. Candidate routes and feasibility", `${routesTable}<p class="muted">Feasibility is deterministic: network state + vehicle restrictions + route constraints + mission deadline + evidence freshness. UNKNOWN is never treated as OPEN; STALE is never presented as current.</p>`),
    section("11. Decisions, authority actions and AI-assisted synthesis", decisionsHtml || "<p class=\"muted\">No decision recorded for this incident.</p>"),
    section("12. Driver instructions", instructionsHtml),
    section("13. Follow-up / reassessment", list(state.reassessments.map((item) => `${formatStamp(item.at)} — ${item.reason} — affected ${item.missionIds.join(", ")}`))),
    section("14. Response actions", list(intel.notifications.map((item) => `${item.state === "done" ? "✓" : "○"} ${item.label}${item.simulated ? " (SIMULATED / DEMO DATA)" : ""} — ${item.detail}`))),
    section("15. Audit events", auditHtml),
    `<footer class="muted">Generated by the NIRNYAY Round-1 prototype. Decision logic ran in the browser; all external feeds are simulated; corridor geometry is schematic demo data. This report is not an official record.</footer>`,
  ].join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>NIRNYAY incident report ${esc(incident.reference)}</title><style>
body{font-family:"Public Sans",Segoe UI,system-ui,sans-serif;color:#191c1e;margin:0;padding:32px;max-width:1040px;margin-inline:auto;line-height:1.45}
h1{font-size:26px;color:#0b2545;margin:4px 0}h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#0b2545;border-bottom:1px solid #c4c6cf;padding-bottom:4px;margin:28px 0 10px}h3{font-size:14px;color:#0b2545;margin:16px 0 6px}
.tag{display:inline-block;border:1px solid #fcd34d;background:#fef3c7;color:#92400e;font-weight:700;font-size:12px;padding:2px 8px;border-radius:2px}
.muted{color:#44474e;font-size:12px}table{border-collapse:collapse;width:100%;font-size:12.5px;margin:6px 0}th,td{border:1px solid #c4c6cf;padding:6px 8px;text-align:left;vertical-align:top}thead th{background:#eceef1}
table.kv th{width:28%;background:#f2f4f7;font-weight:600}.decision{border:1px solid #c4c6cf;padding:10px 12px;margin:10px 0;border-radius:4px}ul{margin:6px 0 6px 18px;padding:0}footer{margin-top:32px;border-top:1px solid #c4c6cf;padding-top:10px}
@media print{body{padding:0}}
</style></head><body>${body}</body></html>`;
}

export function reportRouteLabel(routeId: string): string {
  const route = getRoute(routeId);
  return `${route.name} · ${route.label}`;
}
