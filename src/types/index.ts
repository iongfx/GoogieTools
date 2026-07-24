export type NavLink = {
  href: string;
  label: string;
};

export type FaqItem = {
  question: string;
  answer: string;
  /** Show the “100% Free” Googie badge under the answer. */
  showFreeBadge?: boolean;
};
