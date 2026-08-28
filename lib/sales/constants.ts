import { SalesLeadStatus, SalesStrategyChannel } from "@/entities";

// ---------------------------------------------------------------------------
// Statuses
// ---------------------------------------------------------------------------

export type SalesLeadStatusMeta = {
  status: SalesLeadStatus;
  label: string;
  /** What the status means, so two people do not read it differently. */
  description: string;
  /** Closed statuses drop out of the working list and stop asking for a date. */
  isClosed: boolean;
};

// Ordered the way a lead progresses, which is also the order the filter row and
// the status picker read in.
export const SALES_LEAD_STATUSES: SalesLeadStatusMeta[] = [
  {
    status: SalesLeadStatus.New,
    label: "New",
    description: "On the list, nobody has tried yet.",
    isClosed: false,
  },
  {
    status: SalesLeadStatus.Contacted,
    label: "Tried",
    description: "We reached out. Nobody has answered yet.",
    isClosed: false,
  },
  {
    status: SalesLeadStatus.FollowingUp,
    label: "Talking",
    description: "They answered. There is a reason to go back.",
    isClosed: false,
  },
  {
    status: SalesLeadStatus.Meeting,
    label: "Meeting set",
    description: "A call or meeting is in the diary.",
    isClosed: false,
  },
  {
    status: SalesLeadStatus.Proposal,
    label: "Quoted",
    description: "They have our numbers and we are waiting.",
    isClosed: false,
  },
  {
    status: SalesLeadStatus.Won,
    label: "Won",
    description: "They signed.",
    isClosed: true,
  },
  {
    status: SalesLeadStatus.Lost,
    label: "Lost",
    description: "Going nowhere. Say why in the note.",
    isClosed: true,
  },
];

export const getLeadStatusMeta = (status: SalesLeadStatus) =>
  SALES_LEAD_STATUSES.find((meta) => meta.status === status) ||
  // Anything unrecognised reads as new rather than dropping off the list.
  SALES_LEAD_STATUSES[0];

export const getLeadStatusLabel = (status: SalesLeadStatus) =>
  getLeadStatusMeta(status).label;

export const isClosedStatus = (status: SalesLeadStatus) =>
  getLeadStatusMeta(status).isClosed;

/**
 * How far along a status is, used to answer "did this lead ever answer us?".
 *
 * Lost sits at the bottom with New on purpose: a lead can be lost after a long
 * conversation or lost because nobody ever picked up, and the status alone
 * cannot tell those apart. What it was before it was lost can, which is why
 * the answer is read from a lead's history rather than its current status.
 */
export const STATUS_PROGRESS: Record<SalesLeadStatus, number> = {
  [SalesLeadStatus.New]: 0,
  [SalesLeadStatus.Lost]: 0,
  [SalesLeadStatus.Contacted]: 1,
  [SalesLeadStatus.FollowingUp]: 2,
  [SalesLeadStatus.Meeting]: 3,
  [SalesLeadStatus.Proposal]: 4,
  [SalesLeadStatus.Won]: 5,
};

/** Reaching this means a human on the other side actually engaged. */
export const RESPONDED_PROGRESS = STATUS_PROGRESS[SalesLeadStatus.FollowingUp];

export const getStatusProgress = (status: SalesLeadStatus) =>
  STATUS_PROGRESS[status] ?? 0;

/** Badge styling per status, so a list scans by colour before it is read. */
export const getLeadStatusBadgeClass = (status: SalesLeadStatus) => {
  switch (status) {
    case SalesLeadStatus.Won:
      return "border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
    case SalesLeadStatus.Lost:
      return "border-transparent bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case SalesLeadStatus.Proposal:
      return "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case SalesLeadStatus.Meeting:
      return "border-transparent bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200";
    case SalesLeadStatus.FollowingUp:
      return "border-transparent bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200";
    case SalesLeadStatus.Contacted:
      return "border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200";
    default:
      return "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
};

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export type SalesChannelMeta = {
  channel: SalesStrategyChannel;
  label: string;
};

export const SALES_CHANNELS: SalesChannelMeta[] = [
  { channel: SalesStrategyChannel.Call, label: "Phone call" },
  { channel: SalesStrategyChannel.Email, label: "Email" },
  { channel: SalesStrategyChannel.LinkedIn, label: "LinkedIn" },
  { channel: SalesStrategyChannel.Referral, label: "Referral" },
  { channel: SalesStrategyChannel.Event, label: "Event" },
];

export const getChannelLabel = (channel: SalesStrategyChannel) =>
  SALES_CHANNELS.find((meta) => meta.channel === channel)?.label || "Phone call";
