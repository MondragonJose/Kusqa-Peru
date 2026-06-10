import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { REGION_META, type Region } from "@/domain/regions";

interface SinglePinMapProps {
  latitude: number;
  longitude: number;
  region: Region;
  title: string;
}

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

      const tint = REGION_META[region].tint;
      const icon = L.divIcon({
        className: "kusqa-single-pin",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `<div style="
          width: 30px; height: 30px; border-radius: 50%;
          background: ${tint};
          display: grid; place-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.30), 0 0 0 2px rgba(255,255,255,0.95);
          border: 2px solid white;
        "><span style="font-size: 14px; line-height: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.25));">📍</span></div>`,
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
