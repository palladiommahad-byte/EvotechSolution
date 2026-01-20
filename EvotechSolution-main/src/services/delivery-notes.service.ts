/**
 * Delivery Notes Service
 * Handles all database operations for delivery notes and divers documents using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface DeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface DeliveryNote {
  id: string;
  document_id: string;
  client_id: string | null;
  supplier_id: string | null;
  date: string;
  subtotal: number;
  status: 'draft' | 'delivered' | 'cancelled';
  note: string | null;
  document_type: 'delivery_note' | 'divers';
  created_at: string;
  updated_at: string;
}

export interface DeliveryNoteWithItems extends DeliveryNote {
  items: DeliveryNoteItem[];
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
  supplier?: {
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

export const deliveryNotesService = {
  /**
   * Get all delivery notes with optional filters
   */
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    supplierId?: string;
    documentType?: 'delivery_note' | 'divers';
    startDate?: string;
    endDate?: string;
  }): Promise<DeliveryNoteWithItems[]> {
    try {
      const supabase = getSupabaseClient();

      // Build query - fetch delivery notes only (we'll fetch client/supplier separately)
      let query = supabase
        .from('delivery_notes')
        .select('*');

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }
      if (filters?.documentType) {
        query = query.eq('document_type', filters.documentType);
      }
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      // Order and execute
      const { data: deliveryNotes, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery notes:', error);
        return [];
      }

      // Get items and supplier data for each delivery note
      const deliveryNotesWithItems = await Promise.all(
        (deliveryNotes || []).map(async (note: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('delivery_note_items')
            .select('*')
            .eq('delivery_note_id', note.id)
            .order('created_at', { ascending: true });

          if (itemsError) {
            console.error('Error fetching delivery note items:', itemsError);
          }

          // Get supplier data if supplier_id exists
          let supplier = undefined;
          if (note.supplier_id) {
            const { data: supplierData } = await supabase
              .from('contacts')
              .select('id, name, company, email, phone, ice, if_number, rc')
              .eq('id', note.supplier_id)
              .single();

            if (supplierData) {
              supplier = {
                id: supplierData.id,
                name: supplierData.name,
                company: supplierData.company,
                email: supplierData.email,
                phone: supplierData.phone,
                ice: supplierData.ice,
                if_number: supplierData.if_number,
                rc: supplierData.rc,
              };
            }
          }

          return {
            ...note,
            items: (items || []) as DeliveryNoteItem[],
            client: note.contacts ? {
              id: note.contacts.id,
              name: note.contacts.name,
              company: note.contacts.company,
              email: note.contacts.email,
              phone: note.contacts.phone,
              ice: note.contacts.ice,
              if_number: note.contacts.if_number,
              rc: note.contacts.rc,
            } : undefined,
            supplier,
          } as DeliveryNoteWithItems;
        })
      );

      return deliveryNotesWithItems;
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
      return [];
    }
  },

  /**
   * Get delivery note by ID
   */
  async getById(id: string): Promise<DeliveryNoteWithItems | null> {
    try {
      const supabase = getSupabaseClient();

      // Get delivery note
      const { data: deliveryNote, error } = await supabase
        .from('delivery_notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching delivery note:', error);
        return null;
      }

      // Get items
      const { data: items, error: itemsError } = await supabase
        .from('delivery_note_items')
        .select('*')
        .eq('delivery_note_id', id)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Error fetching delivery note items:', itemsError);
      }

      // Get client data if client_id exists
      let client = undefined;
      if (deliveryNote.client_id) {
        const { data: clientData } = await supabase
          .from('contacts')
          .select('id, name, company, email, phone, ice, if_number, rc')
          .eq('id', deliveryNote.client_id)
          .single();

        if (clientData) {
          client = {
            id: clientData.id,
            name: clientData.name,
            company: clientData.company,
            email: clientData.email,
            phone: clientData.phone,
            ice: clientData.ice,
            if_number: clientData.if_number,
            rc: clientData.rc,
          };
        }
      }

      // Get supplier data if supplier_id exists
      let supplier = undefined;
      if (deliveryNote.supplier_id) {
        const { data: supplierData } = await supabase
          .from('contacts')
          .select('id, name, company, email, phone, ice, if_number, rc')
          .eq('id', deliveryNote.supplier_id)
          .single();

        if (supplierData) {
          supplier = {
            id: supplierData.id,
            name: supplierData.name,
            company: supplierData.company,
            email: supplierData.email,
            phone: supplierData.phone,
            ice: supplierData.ice,
            if_number: supplierData.if_number,
            rc: supplierData.rc,
          };
        }
      }

      return {
        ...deliveryNote,
        items: (items || []) as DeliveryNoteItem[],
        client,
        supplier,
      } as DeliveryNoteWithItems;
    } catch (error) {
      console.error('Error fetching delivery note:', error);
      return null;
    }
  },

  /**
   * Get delivery note by document ID
   */
  async getByDocumentId(documentId: string): Promise<DeliveryNoteWithItems | null> {
    try {
      const supabase = getSupabaseClient();

      const { data: deliveryNote, error } = await supabase
        .from('delivery_notes')
        .select('id')
        .eq('document_id', documentId)
        .single();

      if (error || !deliveryNote) {
        return null;
      }

      return this.getById(deliveryNote.id);
    } catch (error) {
      console.error('Error fetching delivery note by document ID:', error);
      return null;
    }
  },

  /**
   * Create a new delivery note with items
   */
  async create(deliveryNote: {
    document_id: string;
    client_id?: string;
    supplier_id?: string;
    warehouse_id?: string;
    date: string;
    document_type?: 'delivery_note' | 'divers';
    note?: string;
    items: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<DeliveryNoteWithItems> {
    try {
      const supabase = getSupabaseClient();

      // Calculate subtotal
      const subtotal = deliveryNote.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      );

      // Insert delivery note
      const { data: newDeliveryNote, error: deliveryNoteError } = await supabase
        .from('delivery_notes')
        .insert({
          document_id: deliveryNote.document_id,
          client_id: deliveryNote.client_id || null,
          supplier_id: deliveryNote.supplier_id || null,
          warehouse_id: deliveryNote.warehouse_id || 'marrakech',
          date: deliveryNote.date,
          subtotal,
          status: 'draft',
          document_type: deliveryNote.document_type || 'delivery_note',
          note: deliveryNote.note || null,
        })
        .select()
        .single();

      if (deliveryNoteError) {
        console.error('Error creating delivery note:', deliveryNoteError);
        throw deliveryNoteError;
      }

      // Insert items
      const itemsToInsert = deliveryNote.items.map(item => ({
        delivery_note_id: newDeliveryNote.id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('delivery_note_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating delivery note items:', itemsError);
        // Try to delete the delivery note if items insertion fails
        await supabase.from('delivery_notes').delete().eq('id', newDeliveryNote.id);
        throw itemsError;
      }

      // Return the complete delivery note
      const result = await this.getById(newDeliveryNote.id);
      if (!result) {
        throw new Error('Failed to retrieve created delivery note');
      }
      return result;
    } catch (error) {
      console.error('Error creating delivery note:', error);
      throw error;
    }
  },

  /**
   * Update delivery note
   */
  async update(id: string, deliveryNote: {
    date?: string;
    status?: DeliveryNote['status'];
    note?: string;
    items?: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<DeliveryNoteWithItems> {
    try {
      const supabase = getSupabaseClient();

      let updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (deliveryNote.date) updateData.date = deliveryNote.date;
      if (deliveryNote.status) updateData.status = deliveryNote.status;
      if (deliveryNote.note !== undefined) updateData.note = deliveryNote.note;

      if (deliveryNote.items) {
        const subtotal = deliveryNote.items.reduce(
          (sum, item) => sum + item.quantity * item.unit_price,
          0
        );

        updateData.subtotal = subtotal;

        // Update items: delete old and insert new
        await supabase
          .from('delivery_note_items')
          .delete()
          .eq('delivery_note_id', id);

        const itemsToInsert = deliveryNote.items.map(item => ({
          delivery_note_id: id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('delivery_note_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error updating delivery note items:', itemsError);
          throw itemsError;
        }
      }

      const { data, error } = await supabase
        .from('delivery_notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating delivery note:', error);
        throw error;
      }

      const result = await this.getById(id);
      if (!result) {
        throw new Error('Failed to retrieve updated delivery note');
      }
      return result;
    } catch (error) {
      console.error('Error updating delivery note:', error);
      throw error;
    }
  },

  /**
   * Update delivery note status
   */
  async updateStatus(id: string, status: DeliveryNote['status']): Promise<DeliveryNote> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('delivery_notes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating delivery note status:', error);
        throw error;
      }

      return data as DeliveryNote;
    } catch (error) {
      console.error('Error updating delivery note status:', error);
      throw error;
    }
  },

  /**
   * Delete delivery note
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      // Delete items first (if cascade is not enabled)
      await supabase
        .from('delivery_note_items')
        .delete()
        .eq('delivery_note_id', id);

      // Delete delivery note
      const { error } = await supabase
        .from('delivery_notes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting delivery note:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting delivery note:', error);
      throw error;
    }
  },
};
