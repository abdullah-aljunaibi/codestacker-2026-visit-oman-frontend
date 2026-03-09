import { storageKeys } from "@/lib/persistence/keys";
import { readJsonStorage, writeJsonStorage } from "@/lib/persistence/browser-storage";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function readSavedInterestSlugs(): string[] {
  const slugs = readJsonStorage<string[]>(storageKeys.interests, []);
  if (!Array.isArray(slugs)) {
    return [];
  }

  return unique(slugs.filter((value) => typeof value === "string" && value.length > 0));
}

export function saveInterestSlugs(slugs: string[]): void {
  writeJsonStorage(storageKeys.interests, unique(slugs));
}

export function addSavedInterest(slug: string): string[] {
  const current = readSavedInterestSlugs();
  const next = unique([...current, slug]);
  saveInterestSlugs(next);
  return next;
}

export function removeSavedInterest(slug: string): string[] {
  const next = readSavedInterestSlugs().filter((item) => item !== slug);
  saveInterestSlugs(next);
  return next;
}

export function toggleSavedInterest(slug: string): string[] {
  const current = readSavedInterestSlugs();
  if (current.includes(slug)) {
    return removeSavedInterest(slug);
  }

  return addSavedInterest(slug);
}

export function clearSavedInterests(): void {
  saveInterestSlugs([]);
}
