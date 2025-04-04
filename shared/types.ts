// Structured Gherkin components
export interface GherkinStructure {
  scenario: string;
  given: string;
  when: string;
  and: string[];
  then: string;
  andThen: string[];
}

// AcceptanceCriterion interface to be used across client and server
export interface AcceptanceCriterion {
  id: string;
  description: string; // Gherkin formatted text with Scenario, Given, When, Then structure
  gherkin?: GherkinStructure; // Structured Gherkin components (optional for backward compatibility)
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}