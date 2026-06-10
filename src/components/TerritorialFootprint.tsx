import { useMemo } from "react";
import type { Region, Mission } from "@/types";
import { computeFootprint } from "@/domain/territorial";
import type { Footprint, ActivatedDistrict } from "@/domain/territorial";
import { REGIONS } from "@/domain/regions";

interface TerritorialFootprintProps {
  missions: Mission[];
  compact?: boolean;
  className?: string;
}

/* SVG viewBox constants — matches landing page Peru silhouette */
const VIEW_BOX = "0 0 240 360";
const PERU_PATH =
  "M 60 20 L 100 10 L 140 18 L 160 30 L 175 55 L 185 80 L 180 110 L 195 140 L 200 170 L 190 200 L 195 230 L 180 260 L 160 285 L 140 310 L 120 330 L 100 345 L 80 340 L 60 320 L 45 295 L 35 265 L 30 235 L 40 205 L 35 175 L 45 145 L 40 115 L 50 85 L 45 55 Z";

const REGION_BLOB: Record<Region, { cx: number; cy: number; r: number; color: string }> = {
  costa: { cx: 85, cy: 100, r: 55, color: "oklch(0.82 0.1 200)" },
  sierra: { cx: 125, cy: 180, r: 65, color: "oklch(0.65 0.12 45)" },
  selva: { cx: 145, cy: 280, r: 70, color: "oklch(0.78 0.14 140)" },
};

const REGION_ORDER: Region[] = REGIONS;

/* Route trace paths between region centers */
const ROUTE_TRACES: Record<string, string> = {
  "costa→sierra": "M 85 100 Q 105 140 125 180",
  "sierra→selva": "M 125 180 Q 135 230 145 280",
  "costa→selva": "M 85 100 Q 115 190 145 280",
};

/** Derive the identity fragment from the footprint */
function identityFragment(fp: Footprint): string {
  if (fp.totalMissions === 0) return "Tu territorio está intacto.";
  if (fp.visitedRegions.length === 1) {
    const r = fp.visitedRegions[0];
    if (fp.totalMissions === 1) {
      if (r === "costa") return "Tu ruta comienza en el litoral.";
      if (r === "sierra") return "Tu ruta sube hacia los Andes.";
      return "Tu ruta se adentra en la Amazonía.";
    }
    if (r === "costa") return "Has seguido la orilla del Pacífico.";
    if (r === "sierra") return "Tus pasos cruzan los valles.";
    return "Has remontado los ríos de la selva.";
  }
  if (fp.visitedRegions.length === 2) {
    const [a, b] = fp.visitedRegions;
    const pair = `${a}→${b}`;
    if (pair === "costa→sierra" || pair === "sierra→costa")
      return "Has hecho camino entre el mar y la montaña.";
    if (pair === "costa→selva" || pair === "selva→costa")
      return "Tu ruta cruza del litoral a la selva.";
    return "Has descendido de los Andes a la Amazonía.";
  }
  return "Tu ruta abraza el territorio.";
}

function RegionBlob({
  region,
  visited,
  explored,
}: {
  region: Region;
  visited: boolean;
  explored: boolean;
}) {
  const blob = REGION_BLOB[region];
  const opacity = visited ? (explored ? 0.22 : 0.15) : 0.03;
  return <circle cx={blob.cx} cy={blob.cy} r={blob.r} fill={blob.color} opacity={opacity} />;
}

function RegionBlobs({ fp }: { fp: Footprint }) {
  const visited = new Set(fp.visitedRegions);
  const explored = new Set(fp.exploredRegions);
  return (
    <g>
      {REGION_ORDER.map((r) => (
        <RegionBlob key={r} region={r} visited={visited.has(r)} explored={explored.has(r)} />
      ))}
    </g>
  );
}

function DistrictDots({ districts }: { districts: ActivatedDistrict[] }) {
  return (
    <g>
      {districts.map((d, i) => (
        <circle
          key={`${d.name}-${i}`}
          cx={d.svgX}
          cy={d.svgY}
          r="3"
          fill={REGION_BLOB[d.region].color}
          opacity="0.7"
        />
      ))}
    </g>
  );
}

function RouteTraces({ fp }: { fp: Footprint }) {
  const visited = fp.visitedRegions;
  if (visited.length < 2) return null;

  const traceKeys: string[] = [];
  if (visited.includes("costa") && visited.includes("sierra")) traceKeys.push("costa→sierra");
  if (visited.includes("sierra") && visited.includes("selva")) traceKeys.push("sierra→selva");
  if (visited.includes("costa") && visited.includes("selva") && !visited.includes("sierra")) {
    traceKeys.push("costa→selva");
  }

  return (
    <g>
      {traceKeys.map((key) => (
        <path
          key={key}
          d={ROUTE_TRACES[key]}
          stroke="oklch(0.78 0.17 75 / 0.12)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function EmptyHint() {
  return (
    <g opacity="0.04">
      {REGION_ORDER.map((r) => {
        const blob = REGION_BLOB[r];
        return <circle key={r} cx={blob.cx} cy={blob.cy} r={blob.r} fill={blob.color} />;
      })}
    </g>
  );
}

export function TerritorialFootprint({
  missions,
  compact,
  className = "",
}: TerritorialFootprintProps) {
  const fp = useMemo(() => computeFootprint(missions), [missions]);
  const identity = useMemo(() => identityFragment(fp), [fp]);
  const isEmpty = fp.totalMissions === 0;

  const svgWidth = compact ? "w-[120px]" : "w-full";
  const maxWidth = compact ? "max-w-[140px]" : "max-w-[260px] sm:max-w-[320px]";

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg
        viewBox={VIEW_BOX}
        fill="none"
        className={`${svgWidth} ${maxWidth} h-auto drop-shadow-sm`}
        aria-label="Mapa de tu huella territorial"
      >
        {/* Peru outline */}
        <path
          d={PERU_PATH}
          stroke="oklch(0.78 0.17 75 / 0.4)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Empty-state region hints */}
        {isEmpty && <EmptyHint />}

        {/* Region presence fields — clipped to Peru outline */}
        <g>
          <clipPath id="peruFootprint">
            <path d={PERU_PATH} />
          </clipPath>
          <g clipPath="url(#peruFootprint)">
            <RegionBlobs fp={fp} />
          </g>
        </g>

        {/* Route traces — between visited regions */}
        {!isEmpty && <RouteTraces fp={fp} />}

        {/* District dots */}
        {!isEmpty && <DistrictDots districts={fp.activeDistricts} />}
      </svg>

      {/* Identity fragment */}
      <p className="text-sm sm:text-base text-muted-foreground font-medium text-center leading-relaxed max-w-xs">
        {identity}
      </p>
    </div>
  );
}
