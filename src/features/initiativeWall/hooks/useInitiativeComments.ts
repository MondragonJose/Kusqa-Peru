import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { initiativeCommentKeys } from "@/lib/queryKeys";
import { userRepository } from "@/services/userRepository";
import { initiativeCommentRepository } from "@/services/proposalCommentRepository";
import type {
  CreateInitiativeCommentDTO,
  EditCommentDTO,
  InitiativeComment,
  InitiativeType,
  ProposalResult,
} from "@/services/proposalContract";

const COMMENTS_STALE_MS = 60 * 1000;

export function useInitiativeComments(
  initiativeId: string,
  initiativeType: InitiativeType,
  options: { page?: number } = {},
) {
  const page = options.page ?? 0;
  return useQuery({
    queryKey: initiativeCommentKeys.list(initiativeId, initiativeType, page),
    queryFn: async () => {
      const userId = await userRepository.getAuthenticatedUserId();
      return initiativeCommentRepository.listByInitiative(initiativeId, initiativeType, {
        page,
        pageSize: 20,
        currentUserId: userId,
      });
    },
    staleTime: COMMENTS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: initiativeId.length > 0,
    retry: 1 as const,
  });
}

export function useInitiativeCommentCount(initiativeId: string, initiativeType: InitiativeType) {
  return useQuery({
    queryKey: initiativeCommentKeys.count(initiativeId, initiativeType),
    queryFn: () => initiativeCommentRepository.countByInitiative(initiativeId, initiativeType),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    enabled: initiativeId.length > 0,
    retry: 1 as const,
  });
}

export function useCreateInitiativeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateInitiativeCommentDTO): Promise<ProposalResult<InitiativeComment>> => {
      return initiativeCommentRepository.createForInitiative(dto);
    },
    onSuccess: (result, dto) => {
      if (result.status === "success") {
        queryClient.invalidateQueries({
          queryKey: initiativeCommentKeys.listAll(dto.initiativeId, dto.initiativeType),
        });
        queryClient.invalidateQueries({
          queryKey: initiativeCommentKeys.count(dto.initiativeId, dto.initiativeType),
        });
      }
    },
  });
}

export function useEditInitiativeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: EditCommentDTO): Promise<ProposalResult<InitiativeComment>> => {
      const currentUserId = await userRepository.getAuthenticatedUserId();
      if (!currentUserId) {
        return { status: "error", error: "Necesitas iniciar sesión para editar." };
      }
      return initiativeCommentRepository.editComment({ ...dto, currentUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: initiativeCommentKeys.root });
    },
  });
}

export function useDeleteInitiativeComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string): Promise<ProposalResult<true>> => {
      const currentUserId = await userRepository.getAuthenticatedUserId();
      if (!currentUserId) {
        return { status: "error", error: "Necesitas iniciar sesión para eliminar." };
      }
      return initiativeCommentRepository.softDeleteComment(commentId, currentUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: initiativeCommentKeys.root });
    },
  });
}
