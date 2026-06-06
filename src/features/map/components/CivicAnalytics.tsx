import { useMemo } from "react";
import type { Mission, MapCoords } from "@/types";
import { calculateHaversineDistance, isValidLatLng } from "../utils/projection";
import { Award, Compass, MapPin, TrendingUp } from "lucide-react";

type CivicAnalyticsProps = {
  missions: Mission[];
  userCoords: MapCoords | null;
  onSelectMission: (id: string) => void;
};

type DistrictScore = {
  name: string;
  missionsCount: number;
  totalXP: number;
  participants: number;
  score: number;
  level: "Crítico" | "Activo" | "Foco de Impacto";
};

export function CivicAnalytics({ missions, userCoords, onSelectMission }: CivicAnalyticsProps) {
  // 1. Calcula las puntuaciones de los distritos dinámicamente
  const districtScores = useMemo<DistrictScore[]>(() => {
    const map = new Map<string, { count: number; xp: number; participants: number }>();

    missions.forEach((m) => {
      const distName = m.district.split(",")[0].trim();
      const current = map.get(distName) || { count: 0, xp: 0, participants: 0 };
      map.set(distName, {
        count: current.count + 1,
        xp: current.xp + m.xp,
        participants: current.participants + m.participants,
      });
    });

    const list: DistrictScore[] = [];
    map.forEach((val, name) => {
      // Puntuación sintética en base a volumen
      const score = Math.min(
        100,
        Math.round(val.count * 15 + val.xp * 0.05 + val.participants * 0.4),
      );
      let level: DistrictScore["level"] = "Crítico";
      if (score > 75) level = "Foco de Impacto";
      else if (score > 40) level = "Activo";

      list.push({
        name,
        missionsCount: val.count,
        totalXP: val.xp,
        participants: val.participants,
        score,
        level,
      });
    });

    // Ordenar de mayor a menor score
    return list.sort((a, b) => b.score - a.score);
  }, [missions]);

  // 2. Recomendador de proximidad
  const recommendedMissions = useMemo(() => {
    if (!userCoords || !isValidLatLng(userCoords.lat, userCoords.lng)) {
      return [];
    }

    // Calcula la distancia y ordena las misiones más cercanas
    return missions
      .map((m) => {
        let distance = Infinity;
        if (m.coords && isValidLatLng(m.coords.lat, m.coords.lng)) {
          distance = calculateHaversineDistance(userCoords, m.coords);
        }
        return { ...m, distance };
      })
      .filter((m) => m.distance !== Infinity)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [missions, userCoords]);

  return (
    <div className="glass-strong rounded-3xl p-5 border border-border/40 shadow-soft h-full flex flex-col gap-5">
      {/* 1. District Activity Leaderboard */}
      <div>
        <div className="flex items-center gap-2 border-b border-border/20 pb-3 mb-4">
          <TrendingUp className="h-4.5 w-4.5 text-accent animate-pulse" />
          <h3 className="font-display font-bold text-sm text-foreground">
            Líderes de Activismo Cívico
          </h3>
        </div>

        <div className="space-y-3">
          {districtScores.length > 0 ? (
            districtScores.slice(0, 4).map((d) => (
              <div
                key={d.name}
                className="flex flex-col gap-1 text-xs border border-border/10 p-2.5 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{d.name}</span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                      d.level === "Foco de Impacto"
                        ? "bg-amber-500/10 text-amber-600"
                        : d.level === "Activo"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {d.level}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                  <span>
                    {d.missionsCount} {d.missionsCount === 1 ? "misión" : "misiones"}
                  </span>
                  <span>🔥 +{d.totalXP} XP acumulados</span>
                </div>
                {/* Visual bar */}
                <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-sunrise rounded-full transition-all duration-500"
                    style={{ width: `${d.score}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Explora el mapa para ver el impacto cívico en cada territorio.
            </div>
          )}
        </div>
      </div>

      {/* 2. Proximity Recommendations */}
      {userCoords && recommendedMissions.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2 border-b border-border/20 pb-3 mb-3">
            <Compass className="h-4.5 w-4.5 text-accent animate-spin-slow" />
            <h3 className="font-display font-bold text-sm text-foreground">
              Recomendadas cerca de ti
            </h3>
          </div>

          <div className="space-y-2">
            {recommendedMissions.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectMission(m.id)}
                className="w-full text-left flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/40 border border-transparent hover:border-border/30 transition-all cursor-pointer group"
              >
                <span className="text-2xl bg-secondary rounded-lg p-1.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform select-none">
                  {m.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-xs text-foreground truncate group-hover:text-accent transition-colors">
                    {m.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5 text-accent font-bold">
                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                      {m.distance.toFixed(1)} km
                    </span>
                    <span>·</span>
                    <span>{m.district.split(",")[0]}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
