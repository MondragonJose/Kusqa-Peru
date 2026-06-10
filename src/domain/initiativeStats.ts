import type { Initiative } from "./initiative";
import { Globe, Activity, Users, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type InitiativeStat = {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix: string;
  color: string;
};

export function deriveInitiativeStats(initiatives: Initiative[]): InitiativeStat[] {
  if (initiatives.length === 0) {
    return [
      { icon: Globe, label: "distritos activos", value: 0, suffix: "", color: "text-coast" },
      { icon: Activity, label: "expediciones en marcha", value: 0, suffix: "", color: "text-accent" },
      { icon: Users, label: "jóvenes movilizados", value: 0, suffix: "", color: "text-sierra" },
      { icon: Clock, label: "horas comunitarias", value: 0, suffix: "", color: "text-jungle" },
    ];
  }

  const uniqueDistricts = new Set(
    initiatives
      .map((i) => i.location?.district)
      .filter((d): d is string => !!d),
  ).size;

  const activeCount = initiatives.filter(
    (i) => i.lifecycle === "active" || i.lifecycle === "forming",
  ).length;

  const totalParticipants = initiatives.reduce(
    (sum, i) => sum + (i.participantsCount ?? 0),
    0,
  );

  const estimatedHours = totalParticipants * 2;

  return [
    {
      icon: Globe,
      label: "distritos activos",
      value: uniqueDistricts,
      suffix: "",
      color: "text-coast",
    },
    {
      icon: Activity,
      label: "expediciones en marcha",
      value: activeCount,
      suffix: "",
      color: "text-accent",
    },
    {
      icon: Users,
      label: "jóvenes movilizados",
      value: totalParticipants,
      suffix: "",
      color: "text-sierra",
    },
    {
      icon: Clock,
      label: "horas comunitarias",
      value: estimatedHours,
      suffix: "+",
      color: "text-jungle",
    },
  ];
}
