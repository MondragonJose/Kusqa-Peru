import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import type { DistrictTopSupporter } from "@/services/districtRepository";

interface DistrictTopSupportersProps {
  supporters: DistrictTopSupporter[];
}

const MAX_VISIBLE = 6;

export function DistrictTopSupporters({ supporters }: DistrictTopSupportersProps) {
  const visible = supporters.slice(0, MAX_VISIBLE);
  const totalSupport = supporters.reduce((acc, s) => acc + s.supportCount, 0);

  return (
    <section className="space-y-3" aria-label="Personas que apoyan">
      <h2 className="text-sm font-medium flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        Personas que apoyan
      </h2>
      <div className="rounded-md border border-border/40 bg-card p-3 sm:p-4 space-y-3">
        <div className="flex -space-x-2">
          {visible.map((s, i) => (
            <Avatar key={`${s.username}-${i}`} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={s.avatarUrl ?? undefined} alt={s.firstName} />
              <AvatarFallback className="text-xs">
                {s.firstName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {supporters.length === 1
            ? `${supporters[0].firstName} apoya ${supporters[0].supportCount} ${supporters[0].supportCount === 1 ? "propuesta" : "propuestas"} de este distrito.`
            : `${supporters.length} personas han apoyado propuestas de este distrito (${totalSupport} apoyos en total).`}
        </p>
      </div>
    </section>
  );
}
