import { legacyStorageKeys, storageKeys } from "@/lib/persistence/keys";
import {
  readJsonStorageFromKeys,
  removeStorageKeys,
  writeJsonStorage
} from "@/lib/persistence/browser-storage";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

interface PersistedSavedInterestsEnvelope {
  schemaVersion: 2;
  slugs: string[];
}

function normalizeSavedInterestSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(value.filter((item): item is string => typeof item === "string" && item.length > 0));
}

export function readSavedInterestSlugs(): string[] {
  const persisted = readJsonStorageFromKeys<unknown>(
    [storageKeys.interests, ...legacyStorageKeys.interests],
    null
  );
  const isCurrentEnvelope =
    persisted &&
    typeof persisted === "object" &&
    (persisted as Record<string, unknown>).schemaVersion === 2;

  const slugs =
    isCurrentEnvelope
      ? normalizeSavedInterestSlugs((persisted as PersistedSavedInterestsEnvelope).slugs)
      : normalizeSavedInterestSlugs(persisted);

  if (!isCurrentEnvelope && persisted !== null) {
    saveInterestSlugs(slugs);
  }

  return slugs;
}

export function saveInterestSlugs(slugs: string[]): void {
  writeJsonStorage(storageKeys.interests, {
    schemaVersion: 2,
    slugs: unique(slugs)
  } satisfies PersistedSavedInterestsEnvelope);
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
  removeStorageKeys([storageKeys.interests, ...legacyStorageKeys.interests]);
}
