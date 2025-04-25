/**
 * Customer API Service
 * 
 * Handles all API requests related to customers
 */
import { get, post, patch, del } from './apiClient';
import { Customer } from '@/lib/types';

const BASE_URL = '/api/customers';

/**
 * Get all customers
 */
export const getAllCustomers = async (): Promise<Customer[]> => {
  console.log('[CUSTOMER-SERVICE] Fetching all customers from API...');
  try {
    const response = await get<Customer[]>(BASE_URL);
    console.log('[CUSTOMER-SERVICE] Successfully fetched customers:', response);
    return response;
  } catch (error) {
    console.error('[CUSTOMER-SERVICE] Error fetching customers:', error);
    throw error;
  }
};

/**
 * Get a customer by ID
 */
export const getCustomerById = (customerId: number): Promise<Customer> => {
  return get<Customer>(`${BASE_URL}/${customerId}`);
};

/**
 * Create a new customer
 */
export const createCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
  return post<Customer>(BASE_URL, customerData);
};

/**
 * Update a customer
 */
export const updateCustomer = (
  customerId: number, 
  customerData: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Customer> => {
  return patch<Customer>(`${BASE_URL}/${customerId}`, customerData);
};

/**
 * Delete a customer
 */
export const deleteCustomer = (customerId: number): Promise<void> => {
  return del<void>(`${BASE_URL}/${customerId}`);
};