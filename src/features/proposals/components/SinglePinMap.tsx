import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { ProposalRegion } from "@/services/proposalContract";

interface SinglePinMapProps {
  latitude: number;
  longitude: number;
  region: ProposalRegion;
  title: string;
}

const REGION_TINT: Record<ProposalRegion, string> = {
  costa: "#3b82f6",
  sierra: "#a16207",
  selva: "#16a34a",
};

export function SinglePinMap({ latitude, longitude, region, title }: SinglePinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const instance = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(instance);

      const tint = REGION_TINT[region] ?? "#3b82f6";
      const icon = L.divIcon({
        className: "kusqa-single-pin",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<div style="
          width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
          background: ${tint};
          transform: rotate(-45deg);
          display: grid; place-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          border: 2px solid white;
        "><span style="transform: rotate(45deg); font-size: 13px; line-height: 1;">📍</span></div>`,
      });

      L.marker([latitude, longitude], { icon, title, keyboard: false }).addTo(instance);
      mapRef.current = instance;
    })();

    return () => {
      cancelled = true;
      const current = mapRef.current as { remove: () => void } | null;
      if (current) {
        try {
          current.remove();
        } catch {
          /* noop */
        }
      }
      mapRef.current = null;
    };
  }, [latitude, longitude, region, title]);

  return (
    <div ref={containerRef} className="h-full w-full" aria-label={`Mapa: ${title}`} role="img" />
  );
}
