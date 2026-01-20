/**
 * Document Number Service
 * Uses database RPC function to generate unique document numbers
 * This ensures uniqueness by checking the database directly
 */

import { getSupabaseClient } from './supabase';

export type DocumentType = 
  | 'invoice'           // INV - Sales Invoice
  | 'estimate'          // EST - Estimate/Quote
  | 'purchase_order'    // PO - Purchase Order
  | 'delivery_note'     // DN - Delivery Note
  | 'credit_note'       // CN - Credit Note
  | 'statement'         // ST - Statement
  | 'purchase_invoice'  // PI - Purchase Invoice
  | 'divers';           // DIV - Divers/Miscellaneous

/**
 * Generates a unique document number using the database function
 * This ensures uniqueness by checking all document tables in the database
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
    const supabase = getSupabaseClient();
    
    // Convert date to ISO string if provided
    let dateParam: string | undefined;
    if (documentDate) {
      if (typeof documentDate === 'string') {
        dateParam = documentDate;
      } else {
        dateParam = documentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    }
    
    // Call the database RPC function
    const { data, error } = await supabase.rpc('generate_document_number', {
      p_document_type: documentType,
      p_date: dateParam || null
    });
    
    if (error) {
      console.error('Error generating document number from database:', error);
      // Fallback to client-side generation if RPC fails
      throw error;
    }
    
    if (!data) {
      throw new Error('No document number returned from database');
    }
    
    return data as string;
  } catch (error) {
    console.error('Error calling generate_document_number RPC:', error);
    // Re-throw to let caller handle or fallback
    throw error;
  }
}
