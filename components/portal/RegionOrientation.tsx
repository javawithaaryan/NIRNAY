import { northeastOutline } from "@/lib/scenario/seed/northeast";

const focusState = "Nagaland";
const stateOrder = ["Arunachal Pradesh", "Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Sikkim", "Tripura"];

export function RegionOrientation() {
  const { width, height, states, dimapur, kohima } = northeastOutline;
  const focus = states.find((state) => state.name === focusState);

  return (
    <section data-region-orientation aria-label="Regional orientation" className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3">
      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-on-surface-variant">
        North East India <span className="text-outline">›</span> <span className="text-primary-container">Nagaland</span> <span className="text-outline">›</span>{" "}
        <span className="text-primary-container">NH-29 corridor</span>
      </p>
      <div className="mt-2 flex items-start gap-3">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Northeast India with Nagaland highlighted" className="h-auto w-36 shrink-0">
          {states.map((state) => (
            <path
              key={state.name}
              d={state.d}
              fill={state.name === focusState ? "#0b2545" : "#dde3ec"}
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinejoin="round"
            >
              <title>{state.name}</title>
            </path>
          ))}
          {focus && <circle cx={focus.cx} cy={focus.cy} r={46} fill="none" stroke="#ba1a1a" strokeWidth={4} strokeDasharray="10 7" />}
          <line x1={dimapur[0]} y1={dimapur[1]} x2={kohima[0]} y2={kohima[1]} stroke="#f59e0b" strokeWidth={7} strokeLinecap="round" />
          <circle cx={dimapur[0]} cy={dimapur[1]} r={6} fill="#ffffff" stroke="#f59e0b" strokeWidth={3} />
          <circle cx={kohima[0]} cy={kohima[1]} r={6} fill="#ffffff" stroke="#f59e0b" strokeWidth={3} />
        </svg>
        <ul className="grid min-w-0 flex-1 grid-cols-1 gap-y-0.5 text-[0.6875rem] leading-tight">
          {stateOrder.map((name) => (
            <li key={name} className={name === focusState ? "flex items-center gap-1.5 font-bold text-primary-container" : "flex items-center gap-1.5 text-on-surface-variant"}>
              <span aria-hidden="true" className={`size-2 shrink-0 rounded-xs ${name === focusState ? "bg-primary-container" : "bg-surface-container-highest"}`} />
              {name}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-xs leading-snug text-on-surface">
        <span className="font-bold text-primary-container">Operational corridor · NH-29</span>
        <br />
        Dimapur → Pherima → Pagala Pahar → Kohima
      </p>
      <p className="mt-1 text-[0.625rem] text-outline">Orientation only · indicative outlines, not authoritative boundaries</p>
    </section>
  );
}
