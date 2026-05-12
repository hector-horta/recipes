import type { SeverityLevel } from './user';

/**
 * Medical profile used by SecurityScrubber for ingredient risk analysis.
 * Shared between Wati (allergies source) and Nutri (disease management).
 */
export interface MedicalProfile {
  allergies: string[];
  intolerances: string[];
  conditions: string[];
  severities: Record<string, SeverityLevel>;
}
