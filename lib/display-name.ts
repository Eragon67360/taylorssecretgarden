/**
 * The name a Member writes under: their own, else their email's local part.
 * Shared by the composer (browser) and the stored Member (service/swiftter.ts).
 */
export function displayNameOf(person: { name?: string | null; email: string }): string {
  return person.name?.trim() || person.email.split("@")[0] || "Swiftie";
}
