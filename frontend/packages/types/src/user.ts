export type SeverityLevel = 'mild' | 'moderate' | 'severe' | 'anaphylactic';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  diet?: string;
  intolerances?: string[];
  excluded_ingredients?: string;
  daily_calories?: number;
  onboarding_completed: boolean;
  language: string;
  severities?: Record<string, SeverityLevel>;
  conditions?: string[];
  is_verified: boolean;
  createdAt?: string;
}
