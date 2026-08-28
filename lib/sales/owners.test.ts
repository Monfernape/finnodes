import { describe, expect, it } from "vitest";

import { SalesOwnerRow } from "@/entities";
import { getOwnerLabel, getOwnerName, getOwnerOptions } from "./owners";

const manager = (name: string, email: string): SalesOwnerRow => ({
  source: "manager",
  email,
  name,
});

const seat = (name: string, email: string): SalesOwnerRow => ({
  source: "seat",
  email,
  name,
});

describe("getOwnerOptions", () => {
  it("pools managers and seats, since either may be doing the calling", () => {
    const owners = getOwnerOptions([
      manager("Usman", "usman@devnodes.com"),
      seat("Sara", "sara@devnodes.com"),
    ]);

    expect(owners).toEqual([
      { email: "sara@devnodes.com", name: "Sara" },
      { email: "usman@devnodes.com", name: "Usman" },
    ]);
  });

  it("lists somebody on both sides once, under their manager record", () => {
    const owners = getOwnerOptions([
      seat("Usman (seat)", "usman@devnodes.com"),
      manager("Usman", "usman@devnodes.com"),
    ]);

    expect(owners).toEqual([{ email: "usman@devnodes.com", name: "Usman" }]);
  });

  it("settles a duplicate the same way whichever order the rows arrive in", () => {
    const rows = [
      manager("Usman", "usman@devnodes.com"),
      seat("Usman (seat)", "usman@devnodes.com"),
    ];

    expect(getOwnerOptions(rows)[0].name).toBe("Usman");
    expect(getOwnerOptions([...rows].reverse())[0].name).toBe("Usman");
  });

  it("matches duplicates however the email was capitalised", () => {
    const owners = getOwnerOptions([
      manager("Usman", "Usman@DevNodes.com"),
      seat("Usman (seat)", "usman@devnodes.com"),
    ]);

    expect(owners).toHaveLength(1);
    expect(owners[0].email).toBe("usman@devnodes.com");
  });

  it("skips a row with no email, since nothing could reach them", () => {
    expect(getOwnerOptions([seat("Nobody", "")])).toEqual([]);
  });

  it("sorts by name, so the picker reads alphabetically", () => {
    const owners = getOwnerOptions([
      manager("Zara", "zara@devnodes.com"),
      manager("Adnan", "adnan@devnodes.com"),
    ]);

    expect(owners.map((owner) => owner.name)).toEqual(["Adnan", "Zara"]);
  });

  it("returns nothing when the view gave nothing", () => {
    // What a signed-in user without sales access sees.
    expect(getOwnerOptions([])).toEqual([]);
  });
});

describe("getOwnerName", () => {
  const owners = getOwnerOptions([manager("Usman", "usman@devnodes.com")]);

  it("finds a name however the email was typed", () => {
    expect(getOwnerName(owners, "Usman@DevNodes.com")).toBe("Usman");
  });

  it("falls back to the email handle for somebody no longer listed", () => {
    // Someone who has left still has to render on old leads and updates.
    expect(getOwnerName(owners, "former@devnodes.com")).toBe("former");
  });

  it("says unassigned when there is no owner", () => {
    expect(getOwnerName(owners, "")).toBe("Unassigned");
    expect(getOwnerLabel("")).toBe("Unassigned");
  });
});
