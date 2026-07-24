import type { FaqItem } from "@/types";

/** Content for the Password Generator tool page. */

export const PASSWORD_TOOL_HOW_TO = [
  {
    title: "Choose your password length",
    description: "Longer passwords are generally harder to guess.",
  },
  {
    title: "Select the characters to include",
    description:
      "Use uppercase letters, lowercase letters, numbers, and symbols.",
  },
  {
    title: "Generate and copy",
    description:
      "Create your password, review its strength, then copy it securely.",
  },
] as const;

export const PASSWORD_TOOL_USE_CASES = [
  {
    title: "Secure an online account",
    description:
      "Create a unique password instead of reusing one from another service.",
  },
  {
    title: "Protect Wi-Fi or shared systems",
    description:
      "Generate a strong password for networks, devices, or team accounts.",
  },
  {
    title: "Create temporary credentials",
    description:
      "Make random passwords for test accounts, invitations, or short-term access.",
  },
] as const;

export const PASSWORD_TOOL_FAQ: FaqItem[] = [
  {
    question: "Is this password generator free?",
    answer:
      "Yes. You can generate strong passwords with custom length and character options without paying or creating an account.",
    showFreeBadge: true,
  },
  {
    question: "Are my passwords stored or uploaded?",
    answer:
      "No. Passwords are generated in your browser on your device. We do not upload your password or your settings to our servers to create the result. See our Privacy Policy for full details.",
  },
  {
    question: "What makes a password strong?",
    answer:
      "Length and variety matter most. Longer passwords that mix uppercase letters, lowercase letters, numbers, and symbols are generally harder to guess. A reputable password manager and unique passwords for important accounts also help — and this tool does not replace multi-factor authentication.",
  },
  {
    question: "How long should my password be?",
    answer:
      "Aim for at least 12–16 characters for most accounts. Longer is usually better when a service allows it. This tool supports 8–64 characters.",
  },
  {
    question: "Should I use symbols and numbers?",
    answer:
      "Yes, when the service accepts them. Mixing character types increases the number of possible passwords, which generally makes guessing harder.",
  },
  {
    question: "Why avoid ambiguous characters?",
    answer:
      "Characters like I, l, 1, O, o, and 0 are easy to mix up when reading or typing. Turning this option on removes those look-alikes so passwords are easier to share carefully when needed.",
  },
  {
    question: "Is this generator cryptographically secure?",
    answer:
      "Password characters are chosen with the browser Web Crypto API (`crypto.getRandomValues`), which provides cryptographically strong randomness. No tool can promise absolute security — use unique passwords and enable multi-factor authentication where available.",
  },
  {
    question: "Should I reuse the same password?",
    answer:
      "No. Reusing passwords means one breach can expose multiple accounts. Prefer a unique password for each important service, stored in a reputable password manager.",
  },
];
