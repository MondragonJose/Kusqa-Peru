import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { Mission, MapCoords } from "@/types";
import { calculateHaversineDistance, isValidLatLng } from "../utils/projection";
import { Compass, MapPin, Users } from "lucide-react";
import { districtSlugify } from "@/utils/districtSlug";

type CivicAnalyticsProps = {
  missions: Mission[];
  userCoords: MapCoords | null;
  onSelectMission: (id: string) => void;
};

type DistrictActivity = {
  name: string;
  slug: string;
  missionsCount: number;
  supporters: number;
};

export function CivicAnalytics({ missions, userCoords, onSelectMission }: CivicAnalyticsProps) {
  // 1. Distritos con actividad: derivación honesta.
  // No se calculan scores, no se comparan niveles, no hay leaderboard.
  // Sólo se cuentan misiones + personas sumadas, y se enlaza a la página
  // honesta del distrito donde el vecindario puede profundizar.
  const activeDistricts = useMemo<DistrictActivity[]>(() => {
    const map = new Map<string, { count: number; supporters: number }>();
    missions.forEach((m) => {
      const distName = m.district.split(",")[0].trim();
      const current = map.get(distName) || { count: 0, supporters: 0 };
      map.set(distName, {
        count: current.count + 1,
        supporters: current.supporters + m.participants,
      });
    });
    const list: DistrictActivity[] = [];
    map.forEach((val, name) => {
      if (val.count > 0) {
        list.push({
          name,
          slug: districtSlugify(name),
          missionsCount: val.count,
          supporters: val.supporters,
        });
      }
    });
    return list.sort((a, b) => b.missionsCount - a.missionsCount);
  }, [missions]);

  // 2. Recomendador de proximidad (sin ranking competitivo — sólo cercanía).
  const recommendedMissions = useMemo(() => {
    if (!userCoords || !isValidLatLng(userCoords.lat, userCoords.lng)) {
      return [];
    }
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
      {/* 1. Distritos activos — derivación honesta, sin leaderboard ni scores */}
      <div>
        <div className="flex items-center gap-2 border-b border-border/20 pb-3 mb-4">
          <MapPin className="h-4 w-4 text-accent" />
          <h3 className="font-display font-bold text-sm text-foreground">Distritos activos</h3>
        </div>

        <div className="space-y-2">
          {activeDistricts.length > 0 ? (
            activeDistricts.map((d) => (
              <Link
                key={d.slug}
                to="/app/distrito/$slug"
                params={{ slug: d.slug }}
                className="flex items-center justify-between gap-2 text-xs border border-border/10 p-2.5 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-colors"
              >
                <span className="font-bold text-foreground truncate">{d.name}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                  <Users className="h-3 w-3" />
                  {d.missionsCount} {d.missionsCount === 1 ? "misión" : "misiones"}
                </span>
              </Link>
            ))
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Cuando haya misiones activas, aparecerán aquí los distritos donde la gente se está
              reuniendo.
            </div>
          )}
        </div>
      </div>

      {/* 2. Cercanas a ti — recomendación por proximidad, sin ranking competitivo */}
      {userCoords && recommendedMissions.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2 border-b border-border/20 pb-3 mb-3">
            <Compass className="h-4 w-4 text-accent" />
            <h3 className="font-display font-bold text-sm text-foreground">Cercanas a ti</h3>
          </div>

          <div className="space-y-2">
            {recommendedMissions.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelectMission(m.id)}
                className="w-full text-left flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/40 border border-transparent hover:border-border/30 transition-all cursor-pointer group"
              >
                <span className="text-2xl bg-secondary rounded-lg p-1.5 flex items-center justify-center shrink-0 select-none">
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
