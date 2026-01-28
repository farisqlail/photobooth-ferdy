import { FilterOption } from "./types";

export const filters: FilterOption[] = [
  { id: "natural", label: "Natural", value: "none" },
  { id: "bw", label: "B&W", value: "grayscale(100%)" },
  { id: "sepia", label: "Sepia", value: "sepia(80%)" },
  { id: "vivid", label: "Vivid", value: "contrast(1.1) saturate(1.2)" },
];

export const quantityOptions = [1, 2, 3];
