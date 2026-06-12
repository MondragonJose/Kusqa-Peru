import { BookOpen, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { DistrictMemory } from "@/domain/territorialMemory";

interface CivicMemoryEmptyStateProps {
  districtName: string;
  memory: DistrictMemory | null;
}

export function CivicMemoryEmptyState({ districtName, memory }: CivicMemoryEmptyStateProps) {
  const hasHistory = memory !== null && memory.milestones.length + memory.themes.length > 0;

  return (
    <section
      className="rounded-lg border border-border/40 bg-card/40 p-5 sm:p-6 space-y-3"
      aria-label="Estado del distrito"
    >
      {hasHistory ? (
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="space-y-2">
            <h2 className="text-sm font-display font-semibold">
              {districtName} está en un momento de calma
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{memory!.narrative}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada historia comienza con una idea. ¿Te animas a escribir el próximo capítulo?
            </p>
            <Button asChild className="mt-1">
              <Link to="/app/crear" search={{ district: districtName }}>
                Crear una propuesta
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="space-y-2">
            <h2 className="text-sm font-display font-semibold">Un lugar por descubrir</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este distrito aún no tiene historia en KUSQA. Todo primer capítulo empieza con una
              persona que se anima a proponer una idea.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">¿Podrías ser tú?</p>
            <Button asChild className="mt-1">
              <Link to="/app/crear" search={{ district: districtName }}>
                Sé quien inicie la primera historia
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
