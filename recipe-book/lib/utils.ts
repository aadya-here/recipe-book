import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pickRotation(index: number, rotations: readonly string[]) {
  return rotations[index % rotations.length]
}

// Postgrest types many-to-one embeds (e.g. a row's own foreign key) as
// arrays since it can't statically know FK cardinality without generated
// Database types, but the actual value returned is a single object.
export function toOne<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
