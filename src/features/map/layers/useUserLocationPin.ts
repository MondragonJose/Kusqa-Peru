/**
 * useUserLocationPin
 * Manages the user's current GPS location pin on the map.
 * Extracted from MapView.tsx for modularity.
 */
import type { MapCoords } from "@/types";
import { isValidLatLng } from "../utils/projection";

type LeafletInstance = any;

/**
 * Creates or updates the user location pin on the map.
 * Returns the marker instance.
 */
export function createUserLocationPin(L: LeafletInstance, map: LeafletInstance, coords: MapCoords): LeafletInstance {
  if (!isValidLatLng(coords.lat, coords.lng)) return null;

  const userIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-12 h-12">
        <span class="absolute inset-0 rounded-full bg-amber-400/20 animate-ping"></span>
        <span class="absolute w-10 h-10 rounded-full bg-amber-50/80 backdrop-blur-sm border-2 border-amber-300/60 shadow-soft flex items-center justify-center text-lg">🌱</span>
      </div>
    `,
    className: "custom-user-pin",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

  const marker = L.marker([coords.lat, coords.lng], { icon: userIcon });
  marker.bindPopup(
    `<div class="p-2 text-xs text-center leading-snug">
      <span class="text-base">🌱</span><br/>
      <span class="font-semibold text-foreground">Tu presencia cívica</span><br/>
      <span class="text-muted-foreground text-[10px]">en este territorio</span>
    </div>`,
    {
      closeButton: false,
      offset: L.point(0, -5),
    }
  );
  marker.addTo(map);
  return marker;
}
