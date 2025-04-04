/**
 * This file contains common types used throughout the application
 */

/**
 * Structure for storing Gherkin-format acceptance criteria
 */
export interface GherkinStructure {
  scenario: string;
  given: string;
  when: string;
  then: string;
}

/**
 * Acceptance criterion with a title and Gherkin structure
 */
export interface AcceptanceCriterion {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  gherkin: GherkinStructure;
}