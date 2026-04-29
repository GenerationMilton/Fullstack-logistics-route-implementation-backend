export type RegionName =
  | "Andina"
  | "Caribe"
  | "Pacifica"
  | "Orinoquia"
  | "Amazonia";

const CITY_TO_REGION: Record<string, RegionName> = {
  bogota: "Andina",
  medellin: "Andina",
  manizales: "Andina",
  pereira: "Andina",
  ibague: "Andina",
  tunja: "Andina",
  bucaramanga: "Andina",
  cucuta: "Andina",
  cali: "Pacifica",
  buenaventura: "Pacifica",
  pasto: "Pacifica",
  tumaco: "Pacifica",
  barranquilla: "Caribe",
  cartagena: "Caribe",
  "santa marta": "Caribe",
  valledupar: "Caribe",
  riohacha: "Caribe",
  monteria: "Caribe",
  sincelejo: "Caribe",
  yopal: "Orinoquia",
  villavicencio: "Orinoquia",
  "san jose del guaviare": "Orinoquia",
  mocoa: "Amazonia",
  florencia: "Amazonia",
  leticia: "Amazonia",
};

export const UNKNOWN_REGION: RegionName = "Andina";

function normalizeCity(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveRegion(city: string): RegionName {
  const normalized = normalizeCity(city);
  return CITY_TO_REGION[normalized] ?? UNKNOWN_REGION;
}
