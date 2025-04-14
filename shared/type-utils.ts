/**
 * Type Utilities
 * 
 * This module provides TypeScript utilities for consistent type handling
 * across the application. These utilities help ensure type safety and
 * reduce the need for type assertions.
 */

/**
 * Convert Date objects to strings in a type
 * This is useful for serializing data between frontend and backend
 */
export type WithStringDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
    ? string | null
    : T[K] extends Date | undefined
    ? string | undefined
    : T[K] extends Date | null | undefined
    ? string | null | undefined
    : T[K] extends object
    ? WithStringDates<T[K]>
    : T[K];
};

/**
 * Make certain properties in a type required
 */
export type RequireFields<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

/**
 * Make certain properties in a type optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract non-null version of a type
 */
export type NonNullableFields<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

/**
 * Guarantee that a type is not undefined
 */
export type Defined<T> = T extends undefined ? never : T;

/**
 * Create a type that requires at least one of the properties from T
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> 
  & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

/**
 * Create a type where only one of the properties can be defined
 */
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> 
  & {
    [K in Keys]: Required<Pick<T, K>> & { [P in Exclude<Keys, K>]?: never }
  }[Keys];

/**
 * Create a readonly deep version of a type
 */
export type DeepReadonly<T> = 
  T extends (infer R)[] ? ReadonlyArray<DeepReadonly<R>> :
  T extends Function ? T :
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
  T;

/**
 * Extract the return type of a promise
 */
export type PromiseReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : never;

/**
 * Type guard to check if a value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is an object
 */
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is an array of a specific type
 */
export function isArrayOf<T>(
  value: unknown,
  typeGuard: (item: any) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(typeGuard);
}

/**
 * Typesafe property access - convert undefined to null
 * Useful for consistent handling of nullable fields
 */
export function nullify<T, K extends keyof T>(obj: T, key: K): T[K] | null {
  return obj[key] ?? null;
}

/**
 * Parse a string to a date, returning null for invalid dates
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) ? date : null;
}

/**
 * Format a date as an ISO string, handling null/undefined values
 */
export function formatDate(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}