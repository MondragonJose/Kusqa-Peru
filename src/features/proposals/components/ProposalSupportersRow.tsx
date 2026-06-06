import { motion } from "framer-motion";
import { Users, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupportersPreview, useSupportCount } from "@/features/proposals";
import { useSupportProposal } from "@/features/proposals/hooks/useSupportProposal";

interface ProposalSupportersRowProps {
  proposalId: string;
}

const MAX_VISIBLE_AVATARS = 5;

export function ProposalSupportersRow({ proposalId }: ProposalSupportersRowProps) {
  const { data: supporters = [], isLoading } = useSupportersPreview(proposalId, 10);
  const { data: totalCount = 0 } = useSupportCount(proposalId);
  const { isSupported } = useSupportProposal();

  const visibleSupporters = supporters.slice(0, MAX_VISIBLE_AVATARS);
  const overflow = Math.max(0, totalCount - visibleSupporters.length);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="px-5 sm:px-8 py-5 border-b border-border/40"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Comunidad
        </h2>
        <span className="text-xs text-muted-foreground">
          <Heart className="inline h-3 w-3 mr-0.5" />
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
        <p className="text-sm text-muted-foreground">
          Sé la primera persona en apoyar esta iniciativa.
        </p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex -space-x-2">
            {visibleSupporters.map((s) => (
              <Avatar
                key={s.userId}
                className="h-9 w-9 border-2 border-background"
                title={`@${s.username}`}
              >
                {s.avatarUrl ? <AvatarImage src={s.avatarUrl} alt={s.firstName} /> : null}
                <AvatarFallback className="text-[10px] font-semibold bg-accent/10 text-accent">
                  {s.firstName?.charAt(0)?.toUpperCase() || s.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflow > 0 && (
              <div className="h-9 w-9 rounded-full border-2 border-background bg-muted grid place-items-center text-[10px] font-semibold text-muted-foreground">
                +{overflow}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground ml-1">
            {supporters.length > 0 && (
              <>
                {supporters
                  .slice(0, 3)
                  .map((s) => s.firstName || `@${s.username}`)
                  .filter(Boolean)
                  .join(", ")}
                {totalCount > 3 && ` y ${totalCount - 3} más`}
              </>
            )}
          </p>
        </div>
      )}

      {isSupported(proposalId) && (
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
          <Heart className="h-3 w-3 fill-current" /> Tú ya apoyas esta iniciativa
        </p>
      )}
    </motion.section>
  );
}
