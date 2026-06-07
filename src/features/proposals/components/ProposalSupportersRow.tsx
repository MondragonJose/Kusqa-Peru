import { motion } from "framer-motion";
import { Users, Heart, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupportersPreview, useSupportCount } from "@/features/proposals";
import { useSupportProposal } from "@/features/proposals/hooks/useSupportProposal";

interface ProposalSupportersRowProps {
  proposalId: string;
}

const MAX_VISIBLE_AVATARS = 6;

function initialsFor(s: { firstName: string; username: string }): string {
  const first = s.firstName?.charAt(0)?.toUpperCase();
  if (first) return first;
  return s.username.charAt(0).toUpperCase() || "·";
}

export function ProposalSupportersRow({ proposalId }: ProposalSupportersRowProps) {
  const { data: supporters = [], isLoading } = useSupportersPreview(proposalId, 10);
  const { data: totalCount = 0 } = useSupportCount(proposalId);
  const { isSupported } = useSupportProposal();

  const visibleSupporters = supporters.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = Math.max(0, totalCount - visibleSupporters.length);
  const namesLine = supporters
    .slice(0, 3)
    .map((s) => s.firstName || s.username)
    .filter(Boolean)
    .join(", ");

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="px-5 sm:px-8 py-5 border-b border-border/40"
    >
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Comunidad
        </h2>
        <span className="text-xs font-bold text-foreground/80 tabular-nums">
          {totalCount} {totalCount === 1 ? "apoyo" : "apoyos"}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-full" />
          ))}
        </div>
      ) : supporters.length === 0 ? (
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full border-2 border-dashed border-border grid place-items-center">
            <Heart className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Sé la primera persona en apoyar esta iniciativa.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex -space-x-2.5">
            {visibleSupporters.map((s) => (
              <Avatar
                key={s.userId}
                className="h-9 w-9 border-2 border-background ring-1 ring-border/30"
                title={`@${s.username}`}
              >
                {s.avatarUrl ? <AvatarImage src={s.avatarUrl} alt={s.firstName} /> : null}
                <AvatarFallback className="text-[10px] font-bold bg-accent/15 text-accent">
                  {initialsFor(s)}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflow > 0 && (
              <div className="h-9 w-9 rounded-full border-2 border-background bg-muted text-muted-foreground grid place-items-center text-[10px] font-bold ring-1 ring-border/30">
                +{overflow}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground/90 leading-snug">
              {namesLine}
              {totalCount > 3 && (
                <span className="text-muted-foreground"> y {totalCount - 3} más</span>
              )}
            </p>
            {isSupported(proposalId) && (
              <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-medium">
                <Sparkles className="h-3 w-3" /> Tú ya apoyas esta iniciativa
              </p>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}
