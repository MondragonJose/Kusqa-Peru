/**
 * Proposal Governance — restrained moderation primitives.
 *
 * No moderation bureaucracy. No social-media style reporting systems.
 * Archive and duplicate detection are civic, not punitive.
 */

const SIMILARITY_THRESHOLD = 0.4;

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export interface ExistingProposal {
  id: string;
  title: string;
  district: string;
}

export function detectSimilarProposals(
  newTitle: string,
  newDistrict: string,
  existing: ExistingProposal[],
): ExistingProposal[] {
  if (!newTitle.trim() || !newDistrict.trim()) return [];
  const newWords = wordSet(newTitle);

  return existing.filter((p) => {
    if (p.district.toLowerCase() !== newDistrict.toLowerCase()) return false;
    const existingWords = wordSet(p.title);
    return jaccardSimilarity(newWords, existingWords) >= SIMILARITY_THRESHOLD;
  });
}

export function canArchiveProposal(
  proposalAuthorId: string,
  currentUserId: string,
  currentStatus: string,
): boolean {
  if (proposalAuthorId !== currentUserId) return false;
  return currentStatus !== "rejected" && currentStatus !== "resolved";
}

import { deriveRelationship, getAvailableInitiativeActions } from "./initiativeActions";

export function canReportProposal(currentUserId: string, proposalAuthorId: string): boolean {
  const relationship = deriveRelationship(
    { sourceType: "proposal", sourceId: "" },
    { currentUserId, isOwner: currentUserId === proposalAuthorId },
  );
  const actions = getAvailableInitiativeActions({
    lifecycle: "active",
    relationship,
    sourceType: "proposal",
  });
  return actions.includes("report");
}
