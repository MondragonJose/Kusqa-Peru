import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { InitiativeWall } from "../components/InitiativeWall";

vi.mock("@/features/auth", () => ({
  useCurrentUserId: () => "user-1",
}));

vi.mock("../hooks/useInitiativeComments", () => ({
  useInitiativeComments: vi.fn(),
  useCreateInitiativeComment: () => ({ mutate: vi.fn(), isPending: false }),
  useEditInitiativeComment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteInitiativeComment: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { useInitiativeComments } from "../hooks/useInitiativeComments";
const mockUseComments = useInitiativeComments as ReturnType<typeof vi.fn>;

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("InitiativeWall", () => {
  it("renders loading skeleton when data is loading", () => {
    mockUseComments.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="mission-1" initiativeType="mission" />
      </Wrapper>,
    );
    expect(screen.getByRole("region", { name: /conversación cívica/i })).toBeInTheDocument();
    expect(document.querySelector("[aria-busy='true']")).toBeTruthy();
  });

  it("renders empty state when no comments exist", () => {
    mockUseComments.mockReturnValue({
      data: { comments: [], total: 0, hasMore: false },
      isLoading: false,
      isError: false,
    });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="mission-1" initiativeType="mission" />
      </Wrapper>,
    );
    expect(screen.getByText(/aún no hay comentarios/i)).toBeInTheDocument();
  });

  it("renders error state on fetch failure", () => {
    mockUseComments.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="mission-1" initiativeType="mission" />
      </Wrapper>,
    );
    expect(screen.getByText(/no se pudo cargar la conversación/i)).toBeInTheDocument();
  });

  it("renders comments with author and content", () => {
    mockUseComments.mockReturnValue({
      data: {
        comments: [
          {
            id: "c1",
            initiativeId: "mission-1",
            initiativeType: "mission",
            authorId: "user-2",
            authorUsername: "maria",
            authorFirstName: "María",
            authorAvatarUrl: null,
            parentCommentId: null,
            content: "¡Excelente iniciativa!",
            createdAt: "2025-06-01T12:00:00Z",
            updatedAt: "2025-06-01T12:00:00Z",
            isEditable: false,
            isDeleted: false,
          },
        ],
        total: 1,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="mission-1" initiativeType="mission" />
      </Wrapper>,
    );
    expect(screen.getByText("María")).toBeInTheDocument();
    expect(screen.getByText("¡Excelente iniciativa!")).toBeInTheDocument();
  });

  it("shows reply-to indicator when replying", async () => {
    mockUseComments.mockReturnValue({
      data: {
        comments: [
          {
            id: "c2",
            initiativeId: "mission-1",
            initiativeType: "mission",
            authorId: "user-3",
            authorUsername: "carlos",
            authorFirstName: "Carlos",
            authorAvatarUrl: null,
            parentCommentId: null,
            content: "¿Cuándo empieza?",
            createdAt: "2025-06-01T13:00:00Z",
            updatedAt: "2025-06-01T13:00:00Z",
            isEditable: false,
            isDeleted: false,
          },
        ],
        total: 1,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="mission-1" initiativeType="mission" />
      </Wrapper>,
    );
    expect(screen.getByText("¿Cuándo empieza?")).toBeInTheDocument();
  });

  it("renders reply comments indented", () => {
    mockUseComments.mockReturnValue({
      data: {
        comments: [
          {
            id: "c3",
            initiativeId: "mission-1",
            initiativeType: "mission",
            authorId: "user-4",
            authorUsername: "lucia",
            authorFirstName: "Lucía",
            authorAvatarUrl: null,
            parentCommentId: null,
            content: "Me apunto",
            createdAt: "2025-06-01T14:00:00Z",
            updatedAt: "2025-06-01T14:00:00Z",
            isEditable: false,
            isDeleted: false,
          },
          {
            id: "c4",
            initiativeId: "mission-1",
            initiativeType: "mission",
            authorId: "user-5",
            authorUsername: "juan",
            authorFirstName: "Juan",
            authorAvatarUrl: null,
            parentCommentId: "c3",
            content: "¡Bienvenido!",
            createdAt: "2025-06-01T15:00:00Z",
            updatedAt: "2025-06-01T15:00:00Z",
            isEditable: false,
            isDeleted: false,
          },
        ],
        total: 2,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="mission-1" initiativeType="mission" />
      </Wrapper>,
    );
    expect(screen.getByText("Me apunto")).toBeInTheDocument();
    expect(screen.getByText("¡Bienvenido!")).toBeInTheDocument();
  });

  it("shows deleted comment placeholder", () => {
    mockUseComments.mockReturnValue({
      data: {
        comments: [
          {
            id: "c5",
            initiativeId: "mission-1",
            initiativeType: "mission",
            authorId: "user-6",
            authorUsername: "deleted_user",
            authorFirstName: "Deleted",
            authorAvatarUrl: null,
            parentCommentId: null,
            content: "contenido oculto",
            createdAt: "2025-06-01T16:00:00Z",
            updatedAt: "2025-06-01T16:00:00Z",
            isEditable: false,
            isDeleted: true,
          },
        ],
        total: 0,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="mission-1" initiativeType="mission" />
      </Wrapper>,
    );
    expect(screen.getByText(/comentario eliminado/i)).toBeInTheDocument();
  });

  it("applies correct initiative type for proposals", () => {
    mockUseComments.mockReturnValue({
      data: {
        comments: [
          {
            id: "c6",
            initiativeId: "prop-1",
            initiativeType: "proposal",
            authorId: "user-7",
            authorUsername: "ana",
            authorFirstName: "Ana",
            authorAvatarUrl: null,
            parentCommentId: null,
            content: "Comentario de propuesta",
            createdAt: "2025-06-01T17:00:00Z",
            updatedAt: "2025-06-01T17:00:00Z",
            isEditable: false,
            isDeleted: false,
          },
        ],
        total: 1,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="prop-1" initiativeType="proposal" />
      </Wrapper>,
    );
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Comentario de propuesta")).toBeInTheDocument();
  });

  it("shows total comment count", () => {
    mockUseComments.mockReturnValue({
      data: {
        comments: [
          {
            id: "c7",
            initiativeId: "mission-1",
            initiativeType: "mission",
            authorId: "user-8",
            authorUsername: "pedro",
            authorFirstName: "Pedro",
            authorAvatarUrl: null,
            parentCommentId: null,
            content: "Primero",
            createdAt: "2025-06-01T18:00:00Z",
            updatedAt: "2025-06-01T18:00:00Z",
            isEditable: false,
            isDeleted: false,
          },
        ],
        total: 3,
        hasMore: false,
      },
      isLoading: false,
      isError: false,
    });
    render(
      <Wrapper>
        <InitiativeWall initiativeId="mission-1" initiativeType="mission" />
      </Wrapper>,
    );
    expect(screen.getByText("(3)")).toBeInTheDocument();
  });
});
