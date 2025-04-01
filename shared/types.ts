// AcceptanceCriterion interface to be used across client and server
export interface AcceptanceCriterion {
  id: string;
  description: string; // Gherkin formatted text with Scenario, Given, When, Then structure
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}