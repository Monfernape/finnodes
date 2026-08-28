import { SalesOwnerRow } from "@/entities";

export type SalesOwnerOption = {
  email: string;
  name: string;
};

/** The part of an email worth showing when a name was never filled in. */
export const getOwnerLabel = (ownerEmail: string) =>
  ownerEmail ? ownerEmail.split("@")[0] : "Unassigned";

const MANAGER_SOURCE = "manager";

/**
 * Who a lead can be handed to, from the `sales_owner_options` view.
 *
 * Managers and seats are pooled deliberately: the person doing the calling may
 * be either, and email is the one handle both are known by everywhere else in
 * the app. The view has already dropped anyone inactive or without an email —
 * somebody nothing could reach is not an owner — so what is left to do here is
 * settle the people who are on both lists.
 */
export const getOwnerOptions = (rows: SalesOwnerRow[]): SalesOwnerOption[] => {
  const byEmail = new Map<string, SalesOwnerOption>();

  rows.forEach((row) => {
    const email = row.email.toLowerCase();
    if (!email) {
      return;
    }

    // The manager record wins: it is the one with workspace access.
    if (row.source === MANAGER_SOURCE || !byEmail.has(email)) {
      byEmail.set(email, { email, name: row.name });
    }
  });

  return Array.from(byEmail.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
};

/** Falls back to the email when the owner is no longer on either list. */
export const getOwnerName = (
  owners: SalesOwnerOption[],
  ownerEmail: string
) => {
  if (!ownerEmail) {
    return "Unassigned";
  }
  const match = owners.find((owner) => owner.email === ownerEmail.toLowerCase());
  return match?.name || getOwnerLabel(ownerEmail);
};
