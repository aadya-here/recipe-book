import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pickRotation(index: number, rotations: readonly string[]) {
  return rotations[index % rotations.length]
}
