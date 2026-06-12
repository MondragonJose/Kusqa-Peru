import { Link } from "@tanstack/react-router";
import { MapPin, Compass } from "lucide-react";
import { KusqaButton } from "@/components/ui/kusqa-button";
import { iconSize } from "@/design";
import type { DistrictMemory } from "@/domain/territorialMemory";
import type { District } from "@/services/districtRepository";

interface ColdStartMemoryHeroProps {
  district: District;
  memory: DistrictMemory;
}

export function ColdStartMemoryHero({ district, memory }: ColdStartMemoryHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-stone-950 text-white p-6 sm:p-8 shadow-2xl border border-white/10">
      <div className="absolute inset-0 bg-mesh opacity-15 pointer-events-none" />
      <div className="absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-gradient-sunrise opacity-20 blur-3xl animate-float-slow" />
      <div
        className="absolute -bottom-20 -left-20 h-[250px] w-[250px] rounded-full bg-gradient-andes opacity-15 blur-3xl animate-float-slow"
        style={{ animationDelay: "2s" }}
      />
      <div className="relative space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest text-amber-300 border border-white/5">
            <Compass className="h-3 w-3" /> {district.displayName}
          </span>
          {memory.knownFor && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest text-stone-300 border border-white/5">
              {memory.knownFor}
            </span>
          )}
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-[1.05]">
          {district.displayName}
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-sunrise">
            tiene historia
          </span>
        </h1>
        <p className="text-sm text-stone-300 max-w-xl font-medium leading-relaxed">
          {memory.narrative}
        </p>
        {memory.themes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {memory.themes.slice(0, 4).map((t) => (
              <span
                key={t.category}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-[11px] text-stone-300 border border-white/10 font-medium"
              >
                {t.category}
              </span>
            ))}
          </div>
        )}
        {memory.milestones.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
              Huellas
            </p>
            <ul className="space-y-0.5">
              {memory.milestones.slice(0, 3).map((m, i) => (
                <li key={i} className="text-xs text-stone-300 flex items-center gap-2">
                  <span className="text-stone-500">·</span>
                  {m.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <KusqaButton variant="primary" asChild>
            <Link to="/app/mapa">
              Explorar misiones <MapPin className={iconSize.md} />
            </Link>
          </KusqaButton>
          <KusqaButton variant="secondary" asChild>
            <Link to="/app/crear">Crear proyecto</Link>
          </KusqaButton>
        </div>
      </div>
    </section>
  );
}
