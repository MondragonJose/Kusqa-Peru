/**
 * InstitutionProfile — public-safe read-only profile for /app/institucion/$slug.
 *
 * Renders the institution name, kind badge, district, contact fields,
 * and verification_state indicator. No editing affordances.
 */

import { motion } from "framer-motion";
import { Building2, MapPin, Globe, Mail, Phone, Calendar } from "lucide-react";
import type { PublicInstitution } from "@/services/institutionRepository";
import { InstitutionVerificationBadge } from "./InstitutionVerificationBadge";

interface InstitutionProfileProps {
  institution: PublicInstitution;
}

const KIND_LABEL: Record<string, string> = {
  municipality: "Municipalidad",
  ngo: "Organización civil",
  school: "Colegio / Institución educativa",
  collective: "Colectivo vecinal",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

export function InstitutionProfile({ institution }: InstitutionProfileProps) {
  const kindLabel = KIND_LABEL[institution.kind] ?? institution.kind;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background pb-24 lg:pb-12"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header card */}
        <section className="relative rounded-3xl overflow-hidden shadow-sm bg-card border border-border">
          <div
            className="h-32 sm:h-40 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-indigo-500/10"
            aria-hidden="true"
          />
          <div className="px-4 sm:px-6 pb-6 -mt-12 sm:-mt-16 relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-end gap-3">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-background shadow-md shrink-0 bg-card flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-1 pb-1">
                  <h1 className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight">
                    {institution.name}
                  </h1>
                  <p className="text-xs text-muted-foreground">@{institution.slug}</p>
                </div>
              </div>
              <InstitutionVerificationBadge verified={institution.verified} />
            </div>

            <div className="mt-4 space-y-3">
              {/* Kind + district */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                  <Building2 className="h-3 w-3" />
                  {kindLabel}
                </span>
                {institution.districtId && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span className="text-foreground/70">Distrito vinculado</span>
                  </span>
                )}
              </div>

              {/* Description */}
              {institution.description && (
                <p className="text-sm text-foreground/90 leading-relaxed max-w-prose">
                  {institution.description}
                </p>
              )}

              {/* Contact info */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-muted-foreground">
                {institution.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    {institution.email}
                  </span>
                )}
                {institution.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    {institution.phone}
                  </span>
                )}
                {institution.website && (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-3 w-3" />
                    {institution.website}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {formatDate(institution.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Placeholder for future sections (initiatives, contact, etc.) */}
        <section className="rounded-3xl bg-card border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Pronto podrás ver las iniciativas vinculadas a esta institución.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
