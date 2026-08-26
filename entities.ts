import type { JSONContent } from "@tiptap/core";

export enum ExpenseType {
  Shared = "shared",
  PerUnit = "per_unit",
  PerSeat = "per_seat",
}

export enum ManagerStatus {
  Active = "active",
  Inactive = "inactive",
}

export enum SeatStatus {
  Active = "active",
  Inactive = "inactive",
}

export enum OneOnOneStatus {
  NotStarted = "not_started",
  Draft = "draft",
  Completed = "completed",
}

export enum ReviewCycleStatus {
  Draft = "draft",
  Active = "active",
  Closed = "closed",
}

export enum PerformanceReviewStatus {
  Draft = "draft",
  InProgress = "in_progress",
  Submitted = "submitted",
  Published = "published",
  Closed = "closed",
}

export enum ReviewSectionType {
  SelfReview = "self_review",
  ManagerReview = "manager_review",
  ManagerFeedback = "manager_feedback",
  FinalSummary = "final_summary",
}

export enum ReviewSectionStatus {
  Draft = "draft",
  Submitted = "submitted",
  Published = "published",
}

export enum FeedbackRequestStatus {
  Requested = "requested",
  Draft = "draft",
  Submitted = "submitted",
  Published = "published",
  Cancelled = "cancelled",
}

export enum ProjectAssignmentStatus {
  Current = "current",
  Past = "past",
}

export enum LoanBorrowerType {
  Seat = "seat",
  Manager = "manager",
}

export enum LoanInstallmentFrequency {
  Monthly = "monthly",
  Quarterly = "quarterly",
  SemiAnnual = "semi_annual",
}

export enum LoanStatus {
  Active = "active",
  Completed = "completed",
}

export enum SalarySheetType {
  Full = "full",
  First = "first",
  Second = "second",
}

export enum OneOnOneReminderStatus {
  Pending = "pending",
  Sent = "sent",
  Failed = "failed",
}

export enum AnnouncementReminderStatus {
  Pending = "pending",
  Sent = "sent",
  Failed = "failed",
}

export enum AnnouncementCategory {
  // Driven by the calendar, so these are never created by hand.
  PublicHoliday = "public_holiday",
  General = "general",
}

export enum SalarySlipLineType {
  Earning = "earning",
  Deduction = "deduction",
}

export type Expense = {
  id: number;
  title: string;
  amount: number;
  type: ExpenseType;
  unit_manager: number;
  created_at: string;
};

export type Seat = {
  id: number;
  name: string;
  status: SeatStatus;
  auth_user_id: string | null;
  login_email: string | null;
  people_status: SeatStatus;
  people_notes_enabled: boolean;
  bank_linked: boolean;
  cnic: string | null;
  account_number: string | null;
  designation: string | null;
  date_of_joining: string | null;
  gross_salary: number;
  net_salary: number;
  utility_allowance: number;
  fuel_allowance: number;
  meal_allowance: number;
  other_allowance: number;
  created_at: string;
};

export type SalarySheet = {
  id: number;
  month: number;
  year: number;
  sheet_type: SalarySheetType;
  issued_on: string;
  recipient_name: string;
  recipient_bank: string;
  salutation: string;
  letter_body: string;
  created_at: string;
};

export type SalarySheetItem = {
  id: number;
  salary_sheet_id: number;
  seat_id: number | null;
  name: string;
  cnic: string;
  account_number: string;
  designation: string;
  date_of_joining: string;
  gross_salary: number;
  net_salary: number;
  sort_order: number;
  created_at: string;
};

export type Manager = {
  id: number;
  name: string;
  created_at: string;
  seats: number[];
  status: ManagerStatus;
  email: string;
};

export type ExpenseReport = {
  sharedExpense: number;
  perUnitExpense: number;
  perSeatExpense: number;
  totalExpense: number;
  managerName: string;
};

export type Loan = {
  id: number;
  borrower_type: LoanBorrowerType;
  borrower_id: number;
  principal_amount: number;
  duration_months: number;
  installment_frequency: LoanInstallmentFrequency;
  expected_installment_amount: number;
  start_date: string;
  status: LoanStatus;
  total_paid: number;
  completed_at: string | null;
  created_at: string;
};

export type LoanPayment = {
  id: number;
  loan_id: number;
  amount: number;
  paid_at: string;
  note: string | null;
  created_at: string;
};

export type LoanScheduleItem = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  coveredAmount: number;
  remainingAmount: number;
  status: "paid" | "partial" | "pending";
};

export type LoanRecoveryItem = {
  loanId: number;
  borrowerName: string;
  borrowerType: LoanBorrowerType;
  amountDueThisMonth: number;
  paidThisMonth: number;
  remainingThisTurn: number;
  nextDueDate: string | null;
  status: LoanStatus;
};

export type TiptapDoc = {
  type: "doc";
  content?: JSONContent[];
};

export const EMPTY_TIPTAP_DOC: TiptapDoc = {
  type: "doc",
  content: [],
};

export type OneOnOne = {
  id: number;
  seat_id: number;
  year: number;
  month: number;
  agenda: TiptapDoc;
  discussion_notes: TiptapDoc;
  status: OneOnOneStatus;
  created_at: string;
  updated_at: string;
};

export type OneOnOneActionItem = {
  id: number;
  one_on_one_id: number;
  title: string;
  owner_seat_id: number | null;
  owner_manager_email: string | null;
  due_date: string | null;
  status: "open" | "done" | "cancelled";
  created_at: string;
  updated_at: string;
};

export type ManagerPrivateNote = {
  id: number;
  seat_id: number;
  author_email: string;
  body: TiptapDoc;
  linked_one_on_one_id: number | null;
  linked_project_assignment_id: number | null;
  linked_review_cycle_id: number | null;
  created_at: string;
  updated_at: string;
};

export type ReviewCycle = {
  id: number;
  name: string;
  starts_on: string;
  ends_on: string;
  status: ReviewCycleStatus;
  created_at: string;
  updated_at: string;
};

export type PerformanceReview = {
  id: number;
  seat_id: number;
  review_cycle_id: number;
  manager_email: string;
  status: PerformanceReviewStatus;
  created_at: string;
  updated_at: string;
};

export type ReviewSection = {
  id: number;
  performance_review_id: number;
  section_type: ReviewSectionType;
  author_email: string;
  answers: Record<string, string>;
  status: ReviewSectionStatus;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackRequest = {
  id: number;
  subject_seat_id: number;
  reviewer_seat_id: number | null;
  reviewer_email: string | null;
  requested_by_manager_email: string;
  performance_review_id: number | null;
  project_assignment_id: number | null;
  prompt_set: string[];
  answers: Record<string, string>;
  anonymous_to_employee: boolean;
  visible_to_employee: boolean;
  status: FeedbackRequestStatus;
  due_date: string | null;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectAssignment = {
  id: number;
  seat_id: number;
  name: string;
  role: string | null;
  manager_lead_email: string;
  starts_on: string | null;
  ends_on: string | null;
  status: ProjectAssignmentStatus;
  created_at: string;
  updated_at: string;
};

export type TaxYear = {
  id: number;
  tax_year: number;
  starts_on: string;
  ends_on: string;
  surcharge_rate: number;
  surcharge_threshold: number | null;
  notes: string | null;
  created_at: string;
};

export type TaxSlab = {
  id: number;
  tax_year_id: number;
  lower_limit: number;
  upper_limit: number | null;
  fixed_amount: number;
  rate_percent: number;
  sort_order: number;
  created_at: string;
};

export type SalarySlip = {
  id: number;
  seat_id: number;
  month: number;
  year: number;
  issued_on: string;
  employee_name: string;
  designation: string;
  contact_number: string;
  date_of_joining: string | null;
  gross_salary: number;
  net_salary: number;
  total_deductions: number;
  recipient_name: string;
  purpose: string;
  created_by_email: string;
  created_at: string;
};

export type SalarySlipLine = {
  id: number;
  salary_slip_id: number;
  line_type: SalarySlipLineType;
  label: string;
  amount: number;
  sort_order: number;
  created_at: string;
};

export type ExperienceLetter = {
  id: number;
  seat_id: number;
  issued_on: string;
  employee_name: string;
  designation: string;
  date_of_joining: string | null;
  served_until: string | null;
  technologies: string[];
  mentions_client: boolean;
  created_by_email: string;
  created_at: string;
};

export type AnnouncementTemplate = {
  id: number;
  slug: string;
  title: string;
  emoji: string;
  category: AnnouncementCategory;
  // Wording is written once and reused; the tokens in it carry the dates.
  body: string;
  fixed_month: number | null;
  fixed_day: number | null;
  default_duration_days: number;
  reminder_enabled: boolean;
  sort_order: number;
  is_seeded: boolean;
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

export type AnnouncementReminder = {
  id: number;
  announcement_template_id: number;
  // The occurrence reminded about, not the day the email went out.
  occurs_on: string;
  status: AnnouncementReminderStatus;
  attempt_count: number;
  recipient_count: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementCalendarDate = {
  id: number;
  announcement_template_id: number;
  calendar_year: number;
  starts_on: string;
  ends_on: string;
  // Lunar dates are settled by moon sighting, so they are predictions until
  // the Ruet-e-Hilal announcement lands.
  is_estimated: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementVenue = {
  id: number;
  name: string;
  city: string | null;
  cuisine: string | null;
  is_active: boolean;
  notes: string | null;
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

export type OneOnOneReminder = {
  id: number;
  seat_id: number;
  year: number;
  month: number;
  status: OneOnOneReminderStatus;
  attempt_count: number;
  last_attempt_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};
