import { useState, useEffect } from "react";
import { Users, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useInviteCollaborator } from "@/features/proposals/hooks/useProposals";
import type { CollaboratorRole, Proposal } from "@/services/proposalContract";
import { DB_DEFAULTS } from "@/services/proposalContract";

interface QuieroCoOrganizarModalProps {
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuieroCoOrganizarModal({
  proposal,
  open,
  onOpenChange,
}: QuieroCoOrganizarModalProps) {
  const [userHandle, setUserHandle] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("co_author");
  const [message, setMessage] = useState("");
  const { mutate: invite, isPending } = useInviteCollaborator();

  useEffect(() => {
    if (!open) {
      setUserHandle("");
      setRole("co_author");
      setMessage("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userHandle.trim();
    if (!trimmed) {
      toast.error("Ingresa el nombre de usuario de quien quieres invitar.");
      return;
    }
    // The repository expects a user_id (uuid). We pass the handle and let the
    // service layer resolve. To keep the call signature simple, we send the
    // handle as userId and let the server respond with a clear error if
    // invalid — the upsert security definer RPC for resolving handles will be
    // added in a follow-up. For now, the hook expects a uuid. We block here.
    if (!/^[0-9a-f-]{36}$/i.test(trimmed)) {
      toast.error("Por ahora pega el ID de la persona (UUID). Resolver por username llega pronto.");
      return;
    }

    invite(
      {
        proposalId: proposal.id,
        userId: trimmed,
        role,
        message: message.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          if (result.status === "success") {
            toast.success("Invitación enviada", {
              description: "Le avisaremos cuando la persona acepte.",
            });
            onOpenChange(false);
          } else {
            toast.error("error" in result ? result.error : "No se pudo enviar la invitación.");
          }
        },
        onError: () => {
          toast.error("No se pudo enviar la invitación. Intenta de nuevo.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span className="sr-only">Abrir invitación a co-organizar</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Quiero co-organizar
          </DialogTitle>
          <DialogDescription>
            Invita a otra persona de KUSQA a organizar esta propuesta contigo. Sólo tú (quien la
            propuso) puedes enviar invitaciones.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coorg-user">ID de la persona</Label>
            <Input
              id="coorg-user"
              value={userHandle}
              onChange={(e) => setUserHandle(e.target.value)}
              placeholder="uuid de quien quieres invitar"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Pega el identificador de la persona. La búsqueda por @usuario llega en una próxima
              entrega.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as CollaboratorRole)}
              className="grid grid-cols-2 gap-2"
            >
              <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer">
                <RadioGroupItem value="co_author" id="role-coauthor" />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Co-autor/a</span>
                  <span className="block text-xs text-muted-foreground">
                    Co-organiza y firma la propuesta.
                  </span>
                </div>
              </label>
              <label className="flex items-start gap-2 rounded-md border p-3 cursor-pointer">
                <RadioGroupItem value="ally" id="role-ally" />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Aliado/a</span>
                  <span className="block text-xs text-muted-foreground">
                    Apoya y ayuda, sin co-firmar.
                  </span>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coorg-msg">Mensaje (opcional)</Label>
            <Textarea
              id="coorg-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={DB_DEFAULTS.COLLABORATOR_MESSAGE_MAX}
              placeholder="¿Por qué te gustaría que se sumara?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/{DB_DEFAULTS.COLLABORATOR_MESSAGE_MAX}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar invitación
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
