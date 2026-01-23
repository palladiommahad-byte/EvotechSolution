/**
 * Document Number Service
 * Simplified version using client-side generation
 * (Previously used Supabase RPC)
 */

import { generateDocumentNumber, DocumentType } from './document-number-generator';

/**
 * Generates a unique document number
 * Note: This version is client-side only. 
 * In a multi-user environment, this should be handled by the backend.
 * 
 * @param documentType - Type of document to generate
 * @param documentDate - Optional date for the document (defaults to today)
 * @returns Unique document number in format PREFIX-MM/YY/NNNN
 */
export async function generateDocumentNumberFromDB(
  documentType: DocumentType,
  documentDate?: Date | string
): Promise<string> {
  try {
    // For now, we use the client-side generator.
    // In the future, this can be moved to an Express API endpoint.
    return generateDocumentNumber(documentType, [], documentDate);
  } catch (error) {
    console.error('Error generating document number:', error);
    throw error;
  }
}
