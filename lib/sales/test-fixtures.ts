import {
  SalesLead,
  SalesLeadStatus,
  SalesLeadUpdate,
  SalesStrategy,
  SalesStrategyChannel,
} from "@/entities";

/**
 * Builders for the tests. Each takes the handful of fields a given test cares
 * about and fills the rest with something harmless, so a test reads as the one
 * thing it is checking rather than as a wall of columns.
 */

let nextId = 1;
const takeId = () => nextId++;

export const resetFixtureIds = () => {
  nextId = 1;
};

export const buildStrategy = (
  overrides: Partial<SalesStrategy> = {}
): SalesStrategy => ({
  id: takeId(),
  title: "Direct cold call",
  channel: SalesStrategyChannel.Call,
  approach: "",
  follow_up_plan: "",
  follow_up_after_days: 3,
  is_active: true,
  deleted_at: null,
  created_by_email: "usman@devnodes.com",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

export const buildLead = (overrides: Partial<SalesLead> = {}): SalesLead => ({
  id: takeId(),
  company: "Acme Foods",
  contact_name: "Sara",
  contact_role: "Head of Product",
  phone: "+92 300 1234567",
  email: "sara@acme.com",
  source: "LinkedIn",
  strategy_id: null,
  status: SalesLeadStatus.New,
  owner_email: "usman@devnodes.com",
  next_follow_up_on: null,
  notes: "",
  created_by_email: "usman@devnodes.com",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

export const buildUpdate = (
  overrides: Partial<SalesLeadUpdate> = {}
): SalesLeadUpdate => ({
  id: takeId(),
  lead_id: 1,
  happened_on: "2026-08-26",
  note: "Rang, no answer.",
  status_after: null,
  author_email: "usman@devnodes.com",
  created_at: "2026-08-26T00:00:00.000Z",
  ...overrides,
});
