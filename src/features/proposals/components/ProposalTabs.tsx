import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Proposal } from "@/services/proposalContract";
import { ProposalCivicIntent } from "./ProposalCivicIntent";
import { ProposalLocationPreview } from "./ProposalLocationPreview";
import { ProposalSupportersRow } from "./ProposalSupportersRow";
import { formatProposedDate } from "@/utils/date";

const InitiativeWall = lazy(() =>
  import("@/features/initiativeWall").then((m) => ({ default: m.InitiativeWall })),
);

interface ProposalTabsProps {
  proposal: Proposal;
}

export function ProposalTabs({ proposal }: ProposalTabsProps) {
  const dateLabel = formatProposedDate(proposal.proposedDate);
  const hasLocation =
    proposal.locationLabel || (proposal.latitude !== null && proposal.longitude !== null);

  return (
    <Tabs defaultValue="why" className="w-full">
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="why" className="text-xs sm:text-sm">
          Por qué
        </TabsTrigger>
        <TabsTrigger value="what" className="text-xs sm:text-sm">
          Qué se hará
        </TabsTrigger>
        <TabsTrigger value="who" className="text-xs sm:text-sm">
          Quiénes
        </TabsTrigger>
        <TabsTrigger value="talk" className="text-xs sm:text-sm">
          Conversación
        </TabsTrigger>
      </TabsList>

      <TabsContent value="why" className="space-y-4 pt-3">
        <ProposalCivicIntent proposal={proposal} />
      </TabsContent>

      <TabsContent value="what" className="space-y-4 pt-3">
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Lo que se hará</h3>
          {proposal.description ? (
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
              {proposal.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Quien propuso aún no describió los detalles.
            </p>
          )}
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha propuesta</span>
              <span className="font-medium">{dateLabel}</span>
            </div>
            {hasLocation && <ProposalLocationPreview proposal={proposal} />}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equipo</span>
              <span className="font-medium">{proposal.teamSize} personas</span>
            </div>
          </div>
        </section>
      </TabsContent>

      <TabsContent value="who" className="space-y-4 pt-3">
        <ProposalSupportersRow proposalId={proposal.id} />
      </TabsContent>

      <TabsContent value="talk" className="pt-3">
        <Suspense
          fallback={
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          }
        >
          <InitiativeWall initiativeId={proposal.id} initiativeType="proposal" />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
