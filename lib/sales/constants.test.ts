import { describe, expect, it } from "vitest";

import { SalesLeadStatus, SalesStrategyChannel } from "@/entities";
import {
  RESPONDED_PROGRESS,
  SALES_CHANNELS,
  SALES_LEAD_STATUSES,
  STATUS_PROGRESS,
  getChannelLabel,
  getLeadStatusBadgeClass,
  getLeadStatusLabel,
  getLeadStatusMeta,
  getStatusProgress,
  isClosedStatus,
} from "./constants";

describe("SALES_LEAD_STATUSES", () => {
  it("describes every status the database allows", () => {
    const covered = SALES_LEAD_STATUSES.map((meta) => meta.status).sort();
    expect(covered).toEqual(Object.values(SalesLeadStatus).sort());
  });

  it("gives each status its own label", () => {
    const labels = SALES_LEAD_STATUSES.map((meta) => meta.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("runs in the order a lead progresses", () => {
    const progress = SALES_LEAD_STATUSES.filter(
      (meta) => meta.status !== SalesLeadStatus.Lost
    ).map((meta) => getStatusProgress(meta.status));
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
  });
});

describe("getLeadStatusMeta", () => {
  it("falls back to New for a status it does not know", () => {
    // Guards against a status added in SQL but not yet in the app.
    const unknown = "archived";
    expect(getLeadStatusMeta(unknown as SalesLeadStatus).status).toBe(
      SalesLeadStatus.New
    );
  });

  it("labels in plain words a salesperson would use", () => {
    expect(getLeadStatusLabel(SalesLeadStatus.Contacted)).toBe("Tried");
    expect(getLeadStatusLabel(SalesLeadStatus.FollowingUp)).toBe("Talking");
    expect(getLeadStatusLabel(SalesLeadStatus.Proposal)).toBe("Quoted");
  });
});

describe("isClosedStatus", () => {
  it.each([
    [SalesLeadStatus.Won, true],
    [SalesLeadStatus.Lost, true],
    [SalesLeadStatus.New, false],
    [SalesLeadStatus.Contacted, false],
    [SalesLeadStatus.FollowingUp, false],
    [SalesLeadStatus.Meeting, false],
    [SalesLeadStatus.Proposal, false],
  ])("%s -> %s", (status, expected) => {
    expect(isClosedStatus(status)).toBe(expected);
  });
});

describe("STATUS_PROGRESS", () => {
  it("scores lost level with new, because the status alone cannot say why", () => {
    expect(STATUS_PROGRESS[SalesLeadStatus.Lost]).toBe(
      STATUS_PROGRESS[SalesLeadStatus.New]
    );
  });

  it("treats reaching 'talking' as having got a reply", () => {
    expect(RESPONDED_PROGRESS).toBe(STATUS_PROGRESS[SalesLeadStatus.FollowingUp]);
    expect(STATUS_PROGRESS[SalesLeadStatus.Contacted]).toBeLessThan(
      RESPONDED_PROGRESS
    );
    expect(STATUS_PROGRESS[SalesLeadStatus.Meeting]).toBeGreaterThan(
      RESPONDED_PROGRESS
    );
  });

  it("scores an unknown status as no progress rather than crashing", () => {
    const unknown = "archived";
    expect(getStatusProgress(unknown as SalesLeadStatus)).toBe(0);
  });
});

describe("getLeadStatusBadgeClass", () => {
  it("returns a class for every status", () => {
    Object.values(SalesLeadStatus).forEach((status) => {
      expect(getLeadStatusBadgeClass(status)).toContain("bg-");
    });
  });
});

describe("channels", () => {
  it("labels every channel the database allows", () => {
    const covered = SALES_CHANNELS.map((meta) => meta.channel).sort();
    expect(covered).toEqual(Object.values(SalesStrategyChannel).sort());
  });

  it("falls back rather than rendering blank", () => {
    const unknown = "carrier-pigeon";
    expect(getChannelLabel(unknown as SalesStrategyChannel)).toBe("Phone call");
  });
});
