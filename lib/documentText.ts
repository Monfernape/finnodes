// Naming shared by the salary slip and the experience letter.
//
// Both address the employee as "Mr. <full name>" on first mention and
// "Mr. <surname>" after that, which is how the Word templates these replaced
// were written.

export const HONORIFIC = "Mr.";

export const withHonorific = (name: string) => `${HONORIFIC} ${name.trim()}`;

// Falls back to the whole name when there is only one word to work with, so a
// single-name record never renders as a bare honorific.
export const surnameWithHonorific = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return HONORIFIC;
  return `${HONORIFIC} ${parts[parts.length - 1]}`;
};
