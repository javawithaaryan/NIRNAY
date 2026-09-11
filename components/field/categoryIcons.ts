import { Ban, Bridge, CircleEllipsis, Construction, Droplets, Mountain, type LucideIcon } from "lucide-react";
import type { IncidentCategory } from "@/lib/field/types";

export const categoryIcons: Record<IncidentCategory, LucideIcon> = {
  landslide: Mountain,
  flooding: Droplets,
  "road-damage": Construction,
  bridge: Bridge,
  blockage: Ban,
  other: CircleEllipsis,
};
