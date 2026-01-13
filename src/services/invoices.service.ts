/**
 * Invoices Service
 * Handles all database operations for invoices and related documents using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  document_id: string;
  client_id: string;
  date: string;
  due_date: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  payment_method: 'cash' | 'check' | 'bank_transfer' | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
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

export const invoicesService = {
  /**
   * Get all invoices with optional filters
   */
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<InvoiceWithItems[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Build query
      let query = supabase
        .from('invoices')
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
      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      
      // Order and execute
      const { data: invoices, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
      
      // Get items for each invoice
      const invoicesWithItems = await Promise.all(
        (invoices || []).map(async (invoice: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id)
            .order('created_at', { ascending: true });
          
          if (itemsError) {
            console.error('Error fetching invoice items:', itemsError);
          }
          
          return {
            ...invoice,
            items: (items || []) as InvoiceItem[],
            client: invoice.contacts ? {
              id: invoice.contacts.id,
              name: invoice.contacts.name,
              company: invoice.contacts.company,
              email: invoice.contacts.email,
              phone: invoice.contacts.phone,
              ice: invoice.contacts.ice,
              if_number: invoice.contacts.if_number,
              rc: invoice.contacts.rc,
            } : undefined,
          } as InvoiceWithItems;
        })
      );
      
      return invoicesWithItems;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  },

  /**
   * Get invoice by ID
   */
  async getById(id: string): Promise<InvoiceWithItems | null> {
    try {
      const supabase = getSupabaseClient();
      
      // Get invoice with client
      const { data: invoice, error } = await supabase
        .from('invoices')
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
        console.error('Error fetching invoice:', error);
        return null;
      }
      
      // Get items
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at', { ascending: true });
      
      if (itemsError) {
        console.error('Error fetching invoice items:', itemsError);
      }
      
      return {
        ...invoice,
        items: (items || []) as InvoiceItem[],
        client: invoice.contacts ? {
          id: invoice.contacts.id,
          name: invoice.contacts.name,
          company: invoice.contacts.company,
          email: invoice.contacts.email,
          phone: invoice.contacts.phone,
          ice: invoice.contacts.ice,
          if_number: invoice.contacts.if_number,
          rc: invoice.contacts.rc,
        } : undefined,
      } as InvoiceWithItems;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  },

  /**
   * Get invoice by document ID
   */
  async getByDocumentId(documentId: string): Promise<InvoiceWithItems | null> {
    try {
      const supabase = getSupabaseClient();
      
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id')
        .eq('document_id', documentId)
        .single();
      
      if (error || !invoice) {
        return null;
      }
      
      return this.getById(invoice.id);
    } catch (error) {
      console.error('Error fetching invoice by document ID:', error);
      return null;
    }
  },

  /**
   * Create a new invoice with items
   * Note: Supabase doesn't support client-side transactions
   * For production, consider using an Edge Function or RPC function for atomic operations
   */
  async create(invoice: {
    document_id: string;
    client_id: string;
    date: string;
    due_date?: string;
    payment_method?: 'cash' | 'check' | 'bank_transfer';
    note?: string;
    items: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<InvoiceWithItems> {
    try {
      const supabase = getSupabaseClient();
      
      // Calculate totals
      const subtotal = invoice.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      );
      const vatRate = 20.0; // 20% VAT for Morocco
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;

      // Insert invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          document_id: invoice.document_id,
          client_id: invoice.client_id,
          date: invoice.date,
          due_date: invoice.due_date || null,
          subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total,
          payment_method: invoice.payment_method || null,
          status: 'draft',
          note: invoice.note || null,
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        throw invoiceError;
      }

      // Insert items
      const itemsToInsert = invoice.items.map(item => ({
        invoice_id: newInvoice.id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating invoice items:', itemsError);
        // Try to delete the invoice if items insertion fails
        await supabase.from('invoices').delete().eq('id', newInvoice.id);
        throw itemsError;
      }

      // Return the complete invoice
      const result = await this.getById(newInvoice.id);
      if (!result) {
        throw new Error('Failed to retrieve created invoice');
      }
      return result;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  },

  /**
   * Update an invoice with items
   */
  async update(id: string, invoice: {
    date?: string;
    due_date?: string;
    payment_method?: 'cash' | 'check' | 'bank_transfer';
    status?: Invoice['status'];
    note?: string;
    items?: Array<{
      product_id?: string | null;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<InvoiceWithItems> {
    try {
      const supabase = getSupabaseClient();
      
      // If items are provided, recalculate totals
      let subtotal = 0;
      let vatAmount = 0;
      let total = 0;
      
      if (invoice.items && invoice.items.length > 0) {
        subtotal = invoice.items.reduce(
          (sum, item) => sum + item.quantity * item.unit_price,
          0
        );
        const vatRate = 20.0; // 20% VAT for Morocco
        vatAmount = subtotal * (vatRate / 100);
        total = subtotal + vatAmount;
      }
      
      // Update invoice fields
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      
      if (invoice.date !== undefined) updateData.date = invoice.date;
      if (invoice.due_date !== undefined) updateData.due_date = invoice.due_date || null;
      if (invoice.payment_method !== undefined) updateData.payment_method = invoice.payment_method || null;
      if (invoice.status !== undefined) updateData.status = invoice.status;
      if (invoice.note !== undefined) updateData.note = invoice.note || null;
      if (invoice.items && invoice.items.length > 0) {
        updateData.subtotal = subtotal;
        updateData.vat_amount = vatAmount;
        updateData.total = total;
      }
      
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating invoice:', updateError);
        throw updateError;
      }
      
      // Update items if provided
      if (invoice.items) {
        // Delete existing items
        await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);
        
        // Insert new items
        if (invoice.items.length > 0) {
          const itemsToInsert = invoice.items.map(item => ({
            invoice_id: id,
            product_id: item.product_id || null,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
          }));
          
          const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsToInsert);
          
          if (itemsError) {
            console.error('Error updating invoice items:', itemsError);
            throw itemsError;
          }
        }
      }
      
      // Return the complete updated invoice
      const result = await this.getById(id);
      if (!result) {
        throw new Error('Failed to retrieve updated invoice');
      }
      return result;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  },

  /**
   * Update invoice status
   */
  async updateStatus(id: string, status: Invoice['status']): Promise<Invoice> {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating invoice status:', error);
        throw error;
      }
      
      return data as Invoice;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  },

  /**
   * Delete invoice
   * Note: This will cascade delete items due to foreign key constraints
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Delete items first (if cascade is not enabled)
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', id);
      
      // Delete invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting invoice:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  },
};
