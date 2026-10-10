import type { RegistrationModeValue } from "@/features/auth/constants";

export interface RegistrationChoice {
  value: RegistrationModeValue;
  title: string;
  description: string;
}

export const REGISTRATION_CHOICES: RegistrationChoice[] = [
  {
    value: "INVITE",
    title: "Invite only",
    description: "New members need an invite code that you hand out. Recommended.",
  },
  {
    value: "OPEN",
    title: "Open",
    description: "Anyone who can reach this address can create an account.",
  },
  {
    value: "CLOSED",
    title: "Closed",
    description: "Nobody can register. Only existing accounts can sign in.",
  },
];
