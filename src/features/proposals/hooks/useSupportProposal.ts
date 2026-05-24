/**
 * Lightweight proposal support for beta.
 * Uses localStorage for simple tracking without backend complexity.
 * Optimistic UI with visual feedback.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "kusqa_proposal_supports";

function getSupportedProposals(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSupportedProposals(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.error("[KUSQA TRACE] Failed to save proposal supports:", e);
  }
}

type SupportProposalInput = {
  proposalId: string;
};

export function useSupportProposal() {
  const [supported, setSupported] = useState<Set<string>>(getSupportedProposals);
  const [isSupporting, setIsSupporting] = useState(false);

  const supportProposal = useCallback(async ({ proposalId }: SupportProposalInput) => {
    if (isSupporting) return;
    
    const isAlreadySupported = supported.has(proposalId);
    
    if (isAlreadySupported) {
      toast.info("Ya apoyaste esta iniciativa");
      return;
    }

    setIsSupporting(true);

    // Optimistic update
    const newSupported = new Set(supported);
    newSupported.add(proposalId);
    setSupported(newSupported);
    saveSupportedProposals(newSupported);

    // Simulate async for UX feel
    await new Promise(resolve => setTimeout(resolve, 600));

    toast.success("¡Gracias por apoyar esta iniciativa!", {
      description: "Tu apoyo ayuda a movilizar la comunidad",
    });

    setIsSupporting(false);

    if (import.meta.env.DEV) {
      console.log("[KUSQA TRACE] Proposal supported:", proposalId);
    }
  }, [supported, isSupporting]);

  const isSupported = useCallback((proposalId: string) => {
    return supported.has(proposalId);
  }, [supported]);

  return {
    supportProposal,
    isSupported,
    isSupporting,
  };
}
