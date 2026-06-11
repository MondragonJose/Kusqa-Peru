import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { moderationRepository } from "@/services/moderationRepository";

const REASON_OPTIONS: { code: string; label: string }[] = [
  { code: "inappropriate", label: "Contenido inapropiado" },
  { code: "spam", label: "Spam o publicidad" },
  { code: "misinformation", label: "Desinformación" },
  { code: "harassment", label: "Acoso" },
  { code: "violence", label: "Violencia o contenido sensible" },
  { code: "offensive", label: "Lenguaje ofensivo" },
  { code: "other", label: "Otro" },
];

type ReportModalProps = {
  open: boolean;
  onClose: () => void;
  targetType: "mission" | "proposal";
  targetId: string;
  reporterId: string;
};

export function ReportModal({ open, onClose, targetType, targetId, reporterId }: ReportModalProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reasonCode) return;
    setSubmitting(true);
    try {
      await moderationRepository.report({
        reporterId,
        targetType,
        targetId,
        reasonCode,
        description: description || undefined,
      });
      toast.success("Reporte enviado", {
        description: "Gracias por ayudar a mantener la comunidad.",
      });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al enviar reporte";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-display font-bold text-xl">Reportar</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          ¿Por qué motivo reportas este contenido?
        </p>

        <div className="space-y-1.5">
          {REASON_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => setReasonCode(opt.code)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                reasonCode === opt.code
                  ? "bg-destructive/10 text-destructive border border-destructive/30"
                  : "bg-secondary/40 border border-border/30 text-foreground hover:bg-secondary/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe el problema (opcional)"
          rows={3}
          className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none"
          maxLength={2000}
        />

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition-smooth cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reasonCode || submitting}
            className="flex-1 rounded-xl bg-destructive text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Enviando..." : "Enviar reporte"}
          </button>
        </div>
      </div>
    </div>
  );
}
