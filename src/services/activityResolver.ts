/**
 * Activity Resolver — builds DistrictPulse from event_log and participation data.
 *
 * Data sources:
 *   1. event_log table — domain events (EvidenceSubmitted, etc.)
 *   2. mission_participants — recent joins
 *   3. proposal_supports — recent support activity
 *
 * All queries are read-only. This resolver is the ONLY place that
 * assembles DistrictPulse objects.
 */

import type {
  DistrictPulse,
  ActivitySignal,
  ActivitySignalType,
  ActivityFeedItem,
} from "@/domain/activity";
import {
  formatJoinMessage,
  formatSupportMessage,
  formatAwakeningMessage,
  SIGNAL_TEMPLATES,
} from "@/domain/activity";
import { supabase } from "@/lib/supabase";

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugFromDistrictName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function now(): string {
  return new Date().toISOString();
}

function isRecent(iso: string, days: number = 7): boolean {
  const age = Date.now() - new Date(iso).getTime();
  return age < days * 86_400_000;
}

// ─── Signal builders ────────────────────────────────────────────────────────

type RawParticipation = {
  mission_id: string;
  created_at: string;
  mission_title?: string;
};

type RawSupport = {
  proposal_id: string;
  created_at: string;
  proposal_title?: string;
};

async function buildJoinSignals(districtSlug: string): Promise<ActivitySignal[]> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const { data, error } = await supabase
      .from("mission_participants")
      .select("mission_id, created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const signals: ActivitySignal[] = [];
    const byMission = new Map<string, RawParticipation[]>();

    for (const row of data as RawParticipation[]) {
      const existing = byMission.get(row.mission_id) ?? [];
      existing.push(row);
      byMission.set(row.mission_id, existing);
    }

    for (const [missionId, rows] of byMission) {
      const message = formatJoinMessage(rows.length, "una misión");
      // Try to get mission title
      try {
        const { data: mission } = await supabase
          .from("missions")
          .select("title")
          .eq("id", missionId)
          .maybeSingle();
        if (mission) {
          // Override with real title
          signals.push({
            id: `join_${missionId}_${rows.length}`,
            type: "member_joined",
            message: formatJoinMessage(rows.length, mission.title),
            timestamp: rows[0].created_at,
            sourceType: "participation",
            sourceId: missionId,
            districtSlug,
          });
          continue;
        }
      } catch {}

      signals.push({
        id: `join_${missionId}_${rows.length}`,
        type: "member_joined",
        message,
        timestamp: rows[0].created_at,
        sourceType: "participation",
        sourceId: missionId,
        districtSlug,
      });
    }

    return signals;
  } catch {
    return [];
  }
}

async function buildSupportSignals(districtSlug: string): Promise<ActivitySignal[]> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const { data, error } = await supabase
      .from("proposal_supports")
      .select("proposal_id, created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const signals: ActivitySignal[] = [];
    const byProposal = new Map<string, RawSupport[]>();

    for (const row of data as RawSupport[]) {
      const existing = byProposal.get(row.proposal_id) ?? [];
      existing.push(row);
      byProposal.set(row.proposal_id, existing);
    }

    for (const [proposalId, rows] of byProposal) {
      try {
        const { data: proposal } = await supabase
          .from("proposals")
          .select("title, district")
          .eq("id", proposalId)
          .maybeSingle();
        if (proposal) {
          // Skip if this proposal doesn't belong to the requested district
          if (slugFromDistrictName(proposal.district) !== districtSlug) continue;

          signals.push({
            id: `support_${proposalId}_${rows.length}`,
            type: "initiative_gained_support",
            message: formatSupportMessage(proposal.title, rows.length),
            timestamp: rows[0].created_at,
            sourceType: "support",
            sourceId: proposalId,
            districtSlug,
          });
        }
      } catch {}
    }

    return signals;
  } catch {
    return [];
  }
}

// ─── Pulse resolution ───────────────────────────────────────────────────────

function computeVitality(signals: ActivitySignal[]): number {
  if (signals.length === 0) return 0;
  if (signals.length <= 1) return 2;
  if (signals.length <= 3) return 5;
  if (signals.length <= 6) return 7;
  return 10;
}

function buildNarrative(signals: ActivitySignal[], districtName: string): string | null {
  if (signals.length === 0) return null;

  const joinCount = signals.filter((s) => s.type === "member_joined").length;
  const supportCount = signals.filter((s) => s.type === "initiative_gained_support").length;
  const formingCount = signals.filter((s) => s.type === "initiative_forming").length;
  const completedCount = signals.filter((s) => s.type === "initiative_completed").length;

  if (completedCount > 0) return "Una iniciativa se completó esta semana";
  if (joinCount >= 3) return `${joinCount} personas se sumaron esta semana`;
  if (supportCount > 0) return "Una iniciativa ganó apoyo";
  if (formingCount > 0) return "Una nueva iniciativa está tomando forma";
  if (joinCount > 0) return "Alguien se sumó a una iniciativa";

  return formatAwakeningMessage(signals.length, districtName);
}

function buildFeedItems(signals: ActivitySignal[]): ActivityFeedItem[] {
  return signals.map((s) => ({
    id: s.id,
    signal: s,
    initiativeId: s.sourceId,
    initiativeTitle: null,
  }));
}

// ─── Public API ─────────────────────────────────────────────────────────────

async function resolveDistrictPulse(
  districtSlug: string,
  districtName: string,
): Promise<DistrictPulse> {
  const [joinSignals, supportSignals] = await Promise.all([
    buildJoinSignals(districtSlug),
    buildSupportSignals(districtSlug),
  ]);

  const allSignals = [...joinSignals, ...supportSignals].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const lastActivityAt = allSignals.length > 0 ? allSignals[0].timestamp : null;

  return {
    districtSlug,
    districtName,
    signals: allSignals,
    vitalityScore: computeVitality(allSignals),
    lastActivityAt,
    narrative: buildNarrative(allSignals, districtName),
  };
}

async function resolveAllPulses(): Promise<DistrictPulse[]> {
  // Return pulses for known districts — start with the three regions as placeholders
  // In production, this would query district_registry or aggregate from events
  return [];
}

async function resolveFeed(
  districtSlug: string,
  districtName: string,
): Promise<ActivityFeedItem[]> {
  const pulse = await resolveDistrictPulse(districtSlug, districtName);
  return buildFeedItems(pulse.signals);
}

export const activityResolver = {
  resolveDistrictPulse,
  resolveAllPulses,
  resolveFeed,
};
