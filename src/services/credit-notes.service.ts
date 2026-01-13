/**
 * Credit Notes Service
 * Handles all database operations for credit notes using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface CreditNoteItem {
  id: string;
  credit_note_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CreditNote {
  id: string;
  document_id: string;
  client_id: string;
  invoice_id: string | null;
  date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'applied' | 'cancelled';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditNoteWithItems extends CreditNote {
  items: CreditNoteItem[];
  client?: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    ice: string | null;
    if_number: string | null;
    rc: string | null;
  };
}

export const creditNotesService = {
  /**
   * Get all credit notes with optional filters
   */
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<CreditNoteWithItems[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Build query
      let query = supabase
        .from('credit_notes')
        .select(`
          *,
          contacts (
            id,
            name,
            company,
            email,
            phone,
            ice,
            if_number,
            rc
          )
        `);
      
      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      
      // Order and execute
      const { data: creditNotes, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching credit notes:', error);
        return [];
      }
      
      // Get items for each credit note
      const creditNotesWithItems = await Promise.all(
        (creditNotes || []).map(async (creditNote: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('credit_note_items')
            .select('*')
            .eq('credit_note_id', creditNote.id)
            .order('created_at', { ascending: true });
          
          if (itemsError) {
            console.error('Error fetching credit note items:', itemsError);
          }
          
          return {
            ...creditNote,
            items: (items || []) as CreditNoteItem[],
            client: creditNote.contacts ? {
              id: creditNote.contacts.id,
              name: creditNote.contacts.name,
              company: creditNote.contacts.company,
              email: creditNote.contacts.email,
              phone: creditNote.contacts.phone,
              ice: creditNote.contacts.ice,
              if_number: creditNote.contacts.if_number,
              rc: creditNote.contacts.rc,
            } : undefined,
          } as CreditNoteWithItems;
        })
      );
      
      return creditNotesWithItems;
    } catch (error) {
      console.error('Error fetching credit notes:', error);
      return [];
    }
  },

  /**
   * Get credit note by ID
   */
  async getById(id: string): Promise<CreditNoteWithItems | null> {
    try {
      const supabase = getSupabaseClient();
      
      // Get credit note with client
      const { data: creditNote, error } = await supabase
        .from('credit_notes')
        .select(`
          *,
          contacts (
            id,
            name,
            company,
            email,
            phone,
            ice,
            if_number,
            rc
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching credit note:', error);
        return null;
      }
      
      // Get items
      const { data: items, error: itemsError } = await supabase
        .from('credit_note_items')
        .select('*')
        .eq('credit_note_id', id)
        .order('created_at', { ascending: true });
      
      if (itemsError) {
        console.error('Error fetching credit note items:', itemsError);
      }
      
      return {
        ...creditNote,
        items: (items || []) as CreditNoteItem[],
        client: creditNote.contacts ? {
          id: creditNote.contacts.id,
          name: creditNote.contacts.name,
          company: creditNote.contacts.company,
          email: creditNote.contacts.email,
          phone: creditNote.contacts.phone,
          ice: creditNote.contacts.ice,
          if_number: creditNote.contacts.if_number,
          rc: creditNote.contacts.rc,
        } : undefined,
      } as CreditNoteWithItems;
    } catch (error) {
      console.error('Error fetching credit note:', error);
      return null;
    }
  },

  /**
   * Get credit note by document ID
   */
  async getByDocumentId(documentId: string): Promise<CreditNoteWithItems | null> {
    try {
      const supabase = getSupabaseClient();
      
      const { data: creditNote, error } = await supabase
        .from('credit_notes')
        .select('id')
        .eq('document_id', documentId)
        .single();
      
      if (error || !creditNote) {
        return null;
      }
      
      return this.getById(creditNote.id);
    } catch (error) {
      console.error('Error fetching credit note by document ID:', error);
      return null;
    }
  },

  /**
   * Create a new credit note with items
   */
  async create(creditNote: {
    document_id: string;
    client_id: string;
    invoice_id?: string;
    date: string;
    note?: string;
    items: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<CreditNoteWithItems> {
    try {
      const supabase = getSupabaseClient();
      
      // Calculate totals
      const subtotal = creditNote.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      );
      const vatRate = 20.0; // 20% VAT for Morocco
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;

      // Insert credit note
      const { data: newCreditNote, error: creditNoteError } = await supabase
        .from('credit_notes')
        .insert({
          document_id: creditNote.document_id,
          client_id: creditNote.client_id,
          invoice_id: creditNote.invoice_id || null,
          date: creditNote.date,
          subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total,
          status: 'draft',
          note: creditNote.note || null,
        })
        .select()
        .single();

      if (creditNoteError) {
        console.error('Error creating credit note:', creditNoteError);
        throw creditNoteError;
      }

      // Insert items
      const itemsToInsert = creditNote.items.map(item => ({
        credit_note_id: newCreditNote.id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('credit_note_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating credit note items:', itemsError);
        // Try to delete the credit note if items insertion fails
        await supabase.from('credit_notes').delete().eq('id', newCreditNote.id);
        throw itemsError;
      }

      // Return the complete credit note
      const result = await this.getById(newCreditNote.id);
      if (!result) {
        throw new Error('Failed to retrieve created credit note');
      }
      return result;
    } catch (error) {
      console.error('Error creating credit note:', error);
      throw error;
    }
  },

  /**
   * Update credit note
   */
  async update(id: string, creditNote: {
    date?: string;
    status?: CreditNote['status'];
    note?: string;
    items?: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<CreditNoteWithItems> {
    try {
      const supabase = getSupabaseClient();
      
      let updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (creditNote.date) updateData.date = creditNote.date;
      if (creditNote.status) updateData.status = creditNote.status;
      if (creditNote.note !== undefined) updateData.note = creditNote.note;

      if (creditNote.items) {
        const subtotal = creditNote.items.reduce(
          (sum, item) => sum + item.quantity * item.unit_price,
          0
        );
        const vatRate = 20.0;
        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        updateData.subtotal = subtotal;
        updateData.vat_amount = vatAmount;
        updateData.total = total;

        // Update items: delete old and insert new
        await supabase
          .from('credit_note_items')
          .delete()
          .eq('credit_note_id', id);

        const itemsToInsert = creditNote.items.map(item => ({
          credit_note_id: id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('credit_note_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error updating credit note items:', itemsError);
          throw itemsError;
        }
      }

      const { data, error } = await supabase
        .from('credit_notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating credit note:', error);
        throw error;
      }
      
      const result = await this.getById(id);
      if (!result) {
        throw new Error('Failed to retrieve updated credit note');
      }
      return result;
    } catch (error) {
      console.error('Error updating credit note:', error);
      throw error;
    }
  },

  /**
   * Update credit note status
   */
  async updateStatus(id: string, status: CreditNote['status']): Promise<CreditNote> {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('credit_notes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating credit note status:', error);
        throw error;
      }
      
      return data as CreditNote;
    } catch (error) {
      console.error('Error updating credit note status:', error);
      throw error;
    }
  },

  /**
   * Delete credit note
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Delete items first (if cascade is not enabled)
      await supabase
        .from('credit_note_items')
        .delete()
        .eq('credit_note_id', id);
      
      // Delete credit note
      const { error } = await supabase
        .from('credit_notes')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting credit note:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting credit note:', error);
      throw error;
    }
  },
};
