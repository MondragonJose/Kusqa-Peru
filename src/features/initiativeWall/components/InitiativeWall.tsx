import { useState } from "react";
import { MessageCircle, Send, Loader2, Trash2, Edit3, Reply, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserId } from "@/features/auth";
import {
  useCreateInitiativeComment,
  useDeleteInitiativeComment,
  useEditInitiativeComment,
  useInitiativeComments,
} from "@/features/initiativeWall/hooks/useInitiativeComments";
import { DB_DEFAULTS, type InitiativeComment, type InitiativeType } from "@/services/proposalContract";
import { formatRelativeDate } from "@/utils/date";
import { cn } from "@/lib/utils";

interface InitiativeWallProps {
  initiativeId: string;
  initiativeType: InitiativeType;
}

export function InitiativeWall({ initiativeId, initiativeType }: InitiativeWallProps) {
  const userId = useCurrentUserId();
  const { data, isLoading, isError } = useInitiativeComments(initiativeId, initiativeType, { page: 0 });
  const { mutate: createComment, isPending: isCreating } = useCreateInitiativeComment();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<InitiativeComment | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    createComment(
      {
        initiativeId,
        initiativeType,
        content: trimmed,
        parentCommentId: replyTo?.id ?? null,
      },
      {
        onSuccess: (result) => {
          if (result.status === "success") {
            setDraft("");
            setReplyTo(null);
          }
        },
      },
    );
  };

  const topLevel = data?.comments.filter((c) => !c.parentCommentId) ?? [];
  const repliesByParent = new Map<string, InitiativeComment[]>();
  for (const c of data?.comments ?? []) {
    if (c.parentCommentId) {
      const list = repliesByParent.get(c.parentCommentId) ?? [];
      list.push(c);
      repliesByParent.set(c.parentCommentId, list);
    }
  }

  return (
    <section className="space-y-4" aria-label="Conversación cívica">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Conversación</h3>
        {data && <span className="text-xs text-muted-foreground">({data.total})</span>}
      </div>

      {userId ? (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-md border p-3">
          {replyTo && (
            <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
              <span>Respondiendo a {replyTo.authorFirstName}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Cancelar respuesta"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={DB_DEFAULTS.COMMENT_MAX}
            placeholder="Comparte tu punto con respeto. La conversación es pública."
            rows={3}
            disabled={isCreating}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {draft.length}/{DB_DEFAULTS.COMMENT_MAX}
            </span>
            <Button type="submit" size="sm" disabled={isCreating || draft.trim().length === 0}>
              {isCreating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              {replyTo ? "Responder" : "Publicar"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
          Inicia sesión para sumarte a la conversación.
        </p>
      )}

      {isLoading && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          No se pudo cargar la conversación. Intenta de nuevo en unos minutos.
        </p>
      )}

      {!isLoading && !isError && topLevel.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Aún no hay comentarios. Sé el primero en sumarte al diálogo.
        </p>
      )}

      <ul className="space-y-3">
        {topLevel.map((comment) => (
          <li key={comment.id} className="space-y-2">
            <CommentItem
              comment={comment}
              currentUserId={userId}
              onReply={() => setReplyTo(comment)}
            />
            {(repliesByParent.get(comment.id) ?? []).length > 0 && (
              <ul className="ml-8 space-y-2 border-l pl-3">
                {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                  <li key={reply.id}>
                    <CommentItem
                      comment={reply}
                      currentUserId={userId}
                      onReply={() => setReplyTo(reply)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface CommentItemProps {
  comment: InitiativeComment;
  currentUserId: string | null;
  onReply: () => void;
}

function CommentItem({ comment, currentUserId, onReply }: CommentItemProps) {
  const { mutate: edit, isPending: isEditing } = useEditInitiativeComment();
  const { mutate: remove, isPending: isRemoving } = useDeleteInitiativeComment();
  const [isEdit, setIsEdit] = useState(false);
  const [draft, setDraft] = useState(comment.content);

  const isOwn = currentUserId !== null && currentUserId === comment.authorId;
  const initials = comment.authorFirstName.slice(0, 2).toUpperCase();

  if (comment.isDeleted) {
    return <div className="text-xs italic text-muted-foreground">— Comentario eliminado —</div>;
  }

  const handleSaveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === comment.content) {
      setIsEdit(false);
      return;
    }
    edit({ commentId: comment.id, content: trimmed }, { onSuccess: () => setIsEdit(false) });
  };

  return (
    <article
      className={cn("flex gap-2 rounded-md p-2", comment.parentCommentId ? "py-1" : "bg-muted/40")}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={comment.authorAvatarUrl ?? undefined} alt={comment.authorFirstName} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">{comment.authorFirstName}</span>
          <span className="text-muted-foreground">{formatRelativeDate(comment.createdAt)}</span>
        </div>
        {isEdit ? (
          <div className="space-y-1">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={DB_DEFAULTS.COMMENT_MAX}
              rows={2}
              disabled={isEditing}
            />
            <div className="flex gap-1 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEdit(false);
                  setDraft(comment.content);
                }}
                disabled={isEditing}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isEditing || draft.trim().length === 0}
              >
                {isEditing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed break-words">{comment.content}</p>
        )}
        {!isEdit && (
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={onReply}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              aria-label="Responder"
            >
              <Reply className="h-3 w-3" /> Responder
            </button>
            {isOwn && comment.isEditable && (
              <>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => setIsEdit(true)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  aria-label="Editar"
                >
                  <Edit3 className="h-3 w-3" /> Editar
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => remove(comment.id)}
                  disabled={isRemoving}
                  className="flex items-center gap-1 text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3 w-3" /> Eliminar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
