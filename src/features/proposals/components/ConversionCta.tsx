import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KusqaButton } from "@/components/ui/kusqa-button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useProposal, useProposalCoalition } from "@/features/proposals";
import {
  useConvertProposal,
  useReopenProposal,
  useProposalLifecycle,
} from "@/features/districts/hooks";
import { getProposalAuthorNextStep, type ProposalAuthorNextStep } from "@/domain/proposalLifecycle";
import { useCurrentUserId } from "@/features/auth";
import { formatRelativeDate } from "@/utils/date";

interface ConversionCtaProps {
  proposalId: string;
}

/**
 * The conversion CTA. Shown only to the proposal's author.
 * Renders one of:
 *   - "share_to_gather_support"  → no CTA, just a quiet prompt (the Hero already shows the share button)
 *   - "invite_collaborators"     → "Invita a co-organizar"
 *   - "convert_to_mission"       → "Tu iniciativa ya puede convertirse en misión"
 *   - "await_collaborators"      → "Esperando respuestas a invitaciones"
 *   - "no_action"                → not rendered (terminal state)
 */
export function ConversionCta({ proposalId }: ConversionCtaProps) {
  const { data: proposal } = useProposal(proposalId);
  const { data: coalition } = useProposalCoalition(proposalId);
  const { data: lifecycle } = useProposalLifecycle(proposalId);
  const userId = useCurrentUserId();
  const navigate = useNavigate();
  const { mutate: convert, isPending: isConverting } = useConvertProposal();
  const { mutate: reopen, isPending: isReopening } = useReopenProposal();
  const [showReopen, setShowReopen] = useState(false);

  if (!proposal) return null;
  if (!userId || userId !== proposal.userId) return null;

  const stats = coalition?.stats;
  const acceptedCollaborators = coalition?.stats.acceptedCollaboratorCount ?? 0;
  const nextStep: ProposalAuthorNextStep = getProposalAuthorNextStep({
    status: proposal.status,
    supportCount: stats?.supportCount ?? 0,
    acceptedCollaboratorCount: acceptedCollaborators,
    teamSize: proposal.teamSize,
    hasConvertedMissionId: proposal.status === "resolved",
  });

  if (nextStep === "no_action") return null;

  if (nextStep === "convert_to_mission") {
    return (
      <Card className="border-accent/40 bg-accent/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 text-accent shrink-0" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Tu iniciativa ya puede convertirse en misión</h3>
              <p className="text-xs text-muted-foreground">
                Has reunido los apoyos necesarios. Al convertirla, esta propuesta se transforma en
                una misión activa de la comunidad. La historia de la propuesta se preserva.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <KusqaButton
              onClick={() =>
                convert(
                  { proposalId },
                  {
                    onSuccess: (result) => {
                      if (result.status === "success") {
                        toast.success("Tu iniciativa se convirtió en misión.", {
                          description: "Puedes ver la nueva misión desde aquí o desde el distrito.",
                        });
                        navigate({
                          to: "/app/mision/$missionId",
                          params: { missionId: result.data },
                        });
                      } else {
                        toast.error(
                          "error" in result ? result.error : "No se pudo convertir la propuesta.",
                        );
                      }
                    },
                  },
                )
              }
              disabled={isConverting}
              className="text-sm py-2.5"
              aria-label="Convertir en misión"
            >
              {isConverting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Convertir en misión
            </KusqaButton>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/mapa" })}>
              Volver al mapa
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nextStep === "invite_collaborators") {
    return (
      <Card className="border-border/40 bg-card/40">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm">
            <span className="font-medium">Has cruzado el umbral.</span>{" "}
            <span className="text-muted-foreground">
              Invita a alguien a co-organizar para que la propuesta pueda convertirse en misión.
            </span>
          </p>
          <Button asChild variant="outline" size="sm">
            <a href="#qui">
              Ir a Quiénes <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (nextStep === "await_collaborators") {
    return (
      <Card className="border-border/40 bg-card/40">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Esperando respuestas a las invitaciones a co-organizar. Cuando alguien acepte, podrás
            convertir la iniciativa en misión.
          </p>
        </CardContent>
      </Card>
    );
  }

  // showReopen undo for already-converted proposals (post-conversion grace)
  if (proposal.status === "resolved" && lifecycle && lifecycle.length > 0) {
    if (!showReopen) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowReopen(true)}
          className="text-muted-foreground"
        >
          <Undo2 className="h-3.5 w-3.5 mr-1" /> Reabrir propuesta
        </Button>
      );
    }
    return (
      <Card className="border-border/40 bg-card/40">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm">
            <span className="font-medium">¿Reabrir la propuesta?</span>{" "}
            <span className="text-muted-foreground">
              La misión creada se preserva. La propuesta volverá a estado "pendiente".
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReopen(false)}
              disabled={isReopening}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                reopen(
                  { proposalId },
                  {
                    onSuccess: (result) => {
                      if (result.status === "success") {
                        toast.success("Propuesta reabierta.");
                        setShowReopen(false);
                      } else {
                        toast.error("error" in result ? result.error : "No se pudo reabrir.");
                      }
                    },
                  },
                )
              }
              disabled={isReopening}
            >
              {isReopening ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Confirmar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// ─── Lifecycle timeline (for the converted/resolved state) ────────────────

const LIFECYCLE_LABELS: Record<string, { title: string; description: string }> = {
  coalition_threshold_reached: {
    title: "Umbral alcanzado",
    description: "La propuesta reunió los apoyos necesarios para movilizarse.",
  },
  organizer_confirmed: {
    title: "Organización confirmada",
    description: "Quien propuso confirmó que avanzará la iniciativa.",
  },
  mission_created: {
    title: "Convertida en misión",
    description: "La propuesta se transformó en una misión activa del distrito.",
  },
  proposal_locked: {
    title: "Propuesta bloqueada",
    description: "La propuesta se cerró y no acepta más cambios.",
  },
  proposal_reopened: {
    title: "Reabierta",
    description: "La propuesta volvió al estado pendiente.",
  },
};

export function ProposalLifecycleTimeline({ proposalId }: { proposalId: string }) {
  const { data: events, isLoading } = useProposalLifecycle(proposalId);

  if (isLoading) return null;
  if (!events || events.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Historia de la propuesta">
      <h3 className="text-sm font-medium">Historia de la propuesta</h3>
      <ol className="space-y-2">
        {events.map((e) => {
          const copy = LIFECYCLE_LABELS[e.eventType] ?? {
            title: e.eventType,
            description: "",
          };
          return (
            <li key={e.id} className="flex gap-2 rounded-md border border-border/30 bg-card/40 p-3">
              <div className="h-2 w-2 mt-1.5 rounded-full bg-accent shrink-0" />
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium">{copy.title}</p>
                <p className="text-xs text-muted-foreground">{copy.description}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatRelativeDate(e.createdAt)} · {e.actorFirstName}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
