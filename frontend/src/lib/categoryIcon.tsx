import * as icons from "lucide-react";
import { Tag, type LucideIcon } from "lucide-react";

/** Category.icon stores a lucide-react slug (e.g. "trash-2") — this turns
 * that into the matching component, falling back to a generic tag icon for
 * unknown/missing slugs instead of crashing. */
export function getCategoryIcon(slug: string | null | undefined): LucideIcon {
  if (!slug) return Tag;
  const pascalCase = slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const icon = (icons as unknown as Record<string, LucideIcon>)[pascalCase];
  return icon ?? Tag;
}
