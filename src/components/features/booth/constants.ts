import { FilterOption } from "./types";

export const filters: FilterOption[] = [
  { id: "natural", label: "Natural", value: "none" },
  { id: "bw", label: "B&W", value: "grayscale(100%)" },
  { id: "sepia", label: "Sepia", value: "sepia(80%)" },
  { id: "vivid", label: "Vivid", value: "contrast(1.1) saturate(1.2)" },
  { id: "vintage", label: "Vintage", value: "sepia(0.4) contrast(1.2) brightness(0.9)" },
  { id: "noir", label: "Noir", value: "grayscale(100%) contrast(1.5) brightness(0.9)" },
  { id: "dramatic", label: "Dramatic", value: "grayscale(0.5) contrast(1.5) brightness(0.9)" },
  { id: "bright", label: "Bright", value: "brightness(1.15) contrast(1.05)" },
  { id: "soft", label: "Soft", value: "brightness(1.05) contrast(0.9) saturate(0.9)" },
];

export const quantityOptions = [1, 2, 3];
