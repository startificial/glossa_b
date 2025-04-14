/**
 * Extended Types
 * 
 * Contains type extensions and utility types for the frontend
 */
import { 
  Activity, 
  Project, 
  Requirement, 
  ImplementationTask,
  InputData,
  User
} from '@shared/schema';

/**
 * Extended Activity type with projectName and user details
 */
export interface ExtendedActivity extends Activity {
  projectName: string;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
}

/**
 * Extended Implementation Task with projectId
 */
export interface ExtendedImplementationTask extends ImplementationTask {
  projectId?: number;
}

/**
 * Type helper for converting Date fields to string
 * Used for handling date serialization discrepancies
 */
export type WithStringDates<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

/**
 * Project with string dates for frontend usage
 */
export type ProjectWithStringDates = WithStringDates<Project>;

/**
 * Requirement with string dates for frontend usage
 */
export type RequirementWithStringDates = WithStringDates<Requirement>;

/**
 * InputData with string dates for frontend usage
 */
export type InputDataWithStringDates = WithStringDates<InputData>;

/**
 * Activity with string dates for frontend usage
 */
export type ActivityWithStringDates = WithStringDates<Activity>;

/**
 * Extended Activity with string dates for frontend usage
 */
export type ExtendedActivityWithStringDates = WithStringDates<ExtendedActivity>;

/**
 * Implementation Task with string dates for frontend usage
 */
export type ImplementationTaskWithStringDates = WithStringDates<ImplementationTask>;

/**
 * Extended Implementation Task with string dates for frontend usage
 */
export type ExtendedImplementationTaskWithStringDates = WithStringDates<ExtendedImplementationTask>;