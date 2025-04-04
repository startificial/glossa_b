import { ImplementationTask } from '../shared/schema';

/**
 * Extended implementation task type that includes projectId for UI navigation
 */
export interface ExtendedImplementationTask extends ImplementationTask {
  projectId?: number;
}