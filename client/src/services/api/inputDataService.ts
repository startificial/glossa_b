/**
 * Input Data API Service
 * 
 * Handles all API requests related to input data (uploads, processing files)
 */
import { get, post, patch, del } from './apiClient';
import { InputData, InsertInputData } from '@shared/schema';

const BASE_URL = '/api/input-data';

/**
 * Get all input data for a project
 */
export const getInputDataByProjectId = (projectId: number): Promise<InputData[]> => {
  return get<InputData[]>(`/api/projects/${projectId}/input-data`);
};

/**
 * Get input data by ID
 */
export const getInputDataById = (inputDataId: number): Promise<InputData> => {
  return get<InputData>(`${BASE_URL}/${inputDataId}`);
};

/**
 * Upload file input data (FormData version)
 */
export const uploadFileInputData = (
  projectId: number, 
  formData: FormData
): Promise<InputData> => {
  return fetch(`/api/projects/${projectId}/input-data/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })
  .then(async res => {
    if (!res.ok) {
      let errorText;
      try {
        const errorJson = await res.json();
        errorText = errorJson.message || res.statusText;
      } catch (e) {
        try {
          errorText = await res.text();
        } catch (e2) {
          errorText = res.statusText;
        }
      }
      throw new Error(`${res.status}: ${errorText}`);
    }
    return res.json();
  });
};

/**
 * Create input data with URL
 */
export const createURLInputData = (
  projectId: number, 
  data: { url: string; name?: string; description?: string; }
): Promise<InputData> => {
  return post<InputData>(`/api/projects/${projectId}/input-data/url`, data);
};

/**
 * Create text input data
 */
export const createTextInputData = (
  projectId: number, 
  data: { content: string; name: string; description?: string; }
): Promise<InputData> => {
  return post<InputData>(`/api/projects/${projectId}/input-data/text`, data);
};

/**
 * Update input data metadata
 */
export const updateInputData = (
  inputDataId: number, 
  data: Partial<InputData>
): Promise<InputData> => {
  return patch<InputData, Partial<InputData>>(`${BASE_URL}/${inputDataId}`, data);
};

/**
 * Delete input data
 */
export const deleteInputData = (inputDataId: number): Promise<void> => {
  return del<void>(`${BASE_URL}/${inputDataId}`);
};

/**
 * Process input data to generate requirements
 */
export const processInputData = (inputDataId: number): Promise<void> => {
  return post<void>(`${BASE_URL}/${inputDataId}/process`);
};