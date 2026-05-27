/**
 * Territorial Hierarchy Constants
 * Defines the hierarchical structure of Peruvian territories for map navigation.
 * Used by MapView for deep territorial exploration.
 */

export interface TerritoryNode {
  id: string;
  name: string;
  type: "region" | "department" | "district";
  coords: { lat: number; lng: number };
  zoom: number;
  regionKey: "costa" | "sierra" | "selva";
  parent?: string;
  parentId?: string;
}

export const TERRITORY_HIERARCHY: Record<string, TerritoryNode[]> = {
  root: [
    { id: "costa", name: "Costa", type: "region", coords: { lat: -10.0, lng: -77.5 }, zoom: 6, regionKey: "costa" },
    { id: "sierra", name: "Sierra", type: "region", coords: { lat: -13.5, lng: -71.9 }, zoom: 6, regionKey: "sierra" },
    { id: "selva", name: "Selva", type: "region", coords: { lat: -3.7, lng: -73.2 }, zoom: 7, regionKey: "selva" },
  ],
  costa: [
    { id: "lima-dept", name: "Lima Metropolitana", type: "department", coords: { lat: -12.0463, lng: -77.0312 }, zoom: 10, regionKey: "costa" },
    { id: "libertad-dept", name: "La Libertad", type: "department", coords: { lat: -8.116, lng: -79.03 }, zoom: 11, regionKey: "costa" },
  ],
  sierra: [
    { id: "cusco-dept", name: "Cusco", type: "department", coords: { lat: -13.525, lng: -71.972 }, zoom: 10, regionKey: "sierra" },
    { id: "puno-dept", name: "Puno", type: "department", coords: { lat: -15.8402, lng: -70.0219 }, zoom: 10, regionKey: "sierra" },
  ],
  selva: [
    { id: "loreto-dept", name: "Loreto", type: "department", coords: { lat: -3.749, lng: -73.25 }, zoom: 11, regionKey: "selva" }
  ],
  "lima-dept": [
    { id: "barranco", name: "Barranco", type: "district", coords: { lat: -12.148, lng: -77.021 }, zoom: 14, regionKey: "costa" },
    { id: "miraflores", name: "Miraflores", type: "district", coords: { lat: -12.122, lng: -77.029 }, zoom: 14, regionKey: "costa" },
    { id: "sjl", name: "San Juan de Lurigancho", type: "district", coords: { lat: -11.98, lng: -77.01 }, zoom: 13, regionKey: "costa" },
  ],
  "libertad-dept": [
    { id: "trujillo", name: "Trujillo", type: "district", coords: { lat: -8.115, lng: -79.029 }, zoom: 14, regionKey: "costa" },
  ],
  "cusco-dept": [
    { id: "cusco-dist", name: "Cusco Centro", type: "district", coords: { lat: -13.522, lng: -71.967 }, zoom: 14, regionKey: "sierra" },
    { id: "chinchero", name: "Chinchero", type: "district", coords: { lat: -13.391, lng: -72.049 }, zoom: 14, regionKey: "sierra" },
    { id: "urubamba", name: "Urubamba", type: "district", coords: { lat: -13.303, lng: -72.116 }, zoom: 13, regionKey: "sierra" },
  ],
  "puno-dept": [
    { id: "puno-dist", name: "Puno Ciudad", type: "district", coords: { lat: -15.84, lng: -70.02 }, zoom: 14, regionKey: "sierra" }
  ],
  "loreto-dept": [
    { id: "iquitos-dist", name: "Iquitos", type: "district", coords: { lat: -3.74, lng: -73.25 }, zoom: 13, regionKey: "selva" }
  ]
};
