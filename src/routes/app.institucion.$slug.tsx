import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import {
  useInstitution,
  InstitutionProfile,
} from "@/features/institutions";
import { isMunicipalCollabEnabled } from "@/lib/operationalFeature";

export const Route = createFileRoute("/app/institucion/$slug")({
  component: InstitutionPage,
});

function InstitutionPage() {
  const { slug } = useParams({ from: "/app/institucion/$slug" });
  const { data: institution, isLoading, isError } = useInstitution(slug);

  if (!isMunicipalCollabEnabled()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-display font-semibold">Sección no disponible</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Esta funcionalidad no está habilitada actualmente.
        </p>
        <Link
          to="/app"
          aria-label="Volver al inicio"
          className="mt-2 text-sm text-accent hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !institution) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-display font-semibold">No encontramos esta institución</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Es posible que la institución no exista o que el enlace esté incompleto.
        </p>
        <Link
          to="/app"
          aria-label="Volver al inicio"
          className="mt-2 text-sm text-accent hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-12">
          <Link
            to="/app"
            aria-label="Volver al inicio"
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold text-muted-foreground truncate">
            {institution.name}
          </span>
        </div>
      </div>
      <InstitutionProfile institution={institution} />
    </div>
  );
}
