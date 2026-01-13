/**
 * Estimates Service
 * Handles all database operations for estimates using Supabase
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface EstimateItem {
  id: string;
  estimate_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Estimate {
  id: string;
  document_id: string;
  client_id: string;
  date: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateWithItems extends Estimate {
  items: EstimateItem[];
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

export const estimatesService = {
  /**
   * Get all estimates with optional filters
   */
  async getAll(filters?: {
    status?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<EstimateWithItems[]> {
    try {
      const supabase = getSupabaseClient();
      
      // Build query
      let query = supabase
        .from('estimates')
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
      const { data: estimates, error } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching estimates:', error);
        return [];
      }
      
      // Get items for each estimate
      const estimatesWithItems = await Promise.all(
        (estimates || []).map(async (estimate: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('estimate_items')
            .select('*')
            .eq('estimate_id', estimate.id)
            .order('created_at', { ascending: true });
          
          if (itemsError) {
            console.error('Error fetching estimate items:', itemsError);
          }
          
          return {
            ...estimate,
            items: (items || []) as EstimateItem[],
            client: estimate.contacts ? {
              id: estimate.contacts.id,
              name: estimate.contacts.name,
              company: estimate.contacts.company,
              email: estimate.contacts.email,
              phone: estimate.contacts.phone,
              ice: estimate.contacts.ice,
              if_number: estimate.contacts.if_number,
              rc: estimate.contacts.rc,
            } : undefined,
          } as EstimateWithItems;
        })
      );
      
      return estimatesWithItems;
    } catch (error) {
      console.error('Error fetching estimates:', error);
      return [];
    }
  },

  /**
   * Get estimate by ID
   */
  async getById(id: string): Promise<EstimateWithItems | null> {
    try {
      const supabase = getSupabaseClient();
      
      // Get estimate with client
      const { data: estimate, error } = await supabase
        .from('estimates')
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
        console.error('Error fetching estimate:', error);
        return null;
      }
      
      // Get items
      const { data: items, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', id)
        .order('created_at', { ascending: true });
      
      if (itemsError) {
        console.error('Error fetching estimate items:', itemsError);
      }
      
      return {
        ...estimate,
        items: (items || []) as EstimateItem[],
        client: estimate.contacts ? {
          id: estimate.contacts.id,
          name: estimate.contacts.name,
          company: estimate.contacts.company,
          email: estimate.contacts.email,
          phone: estimate.contacts.phone,
          ice: estimate.contacts.ice,
          if_number: estimate.contacts.if_number,
          rc: estimate.contacts.rc,
        } : undefined,
      } as EstimateWithItems;
    } catch (error) {
      console.error('Error fetching estimate:', error);
      return null;
    }
  },

  /**
   * Get estimate by document ID
   */
  async getByDocumentId(documentId: string): Promise<EstimateWithItems | null> {
    try {
      const supabase = getSupabaseClient();
      
      const { data: estimate, error } = await supabase
        .from('estimates')
        .select('id')
        .eq('document_id', documentId)
        .single();
      
      if (error || !estimate) {
        return null;
      }
      
      return this.getById(estimate.id);
    } catch (error) {
      console.error('Error fetching estimate by document ID:', error);
      return null;
    }
  },

  /**
   * Create a new estimate with items
   */
  async create(estimate: {
    document_id: string;
    client_id: string;
    date: string;
    note?: string;
    items: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<EstimateWithItems> {
    try {
      const supabase = getSupabaseClient();
      
      // Calculate totals
      const subtotal = estimate.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      );
      const vatRate = 20.0; // 20% VAT for Morocco
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;

      // Insert estimate
      const { data: newEstimate, error: estimateError } = await supabase
        .from('estimates')
        .insert({
          document_id: estimate.document_id,
          client_id: estimate.client_id,
          date: estimate.date,
          subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total,
          status: 'draft',
          note: estimate.note || null,
        })
        .select()
        .single();

      if (estimateError) {
        console.error('Error creating estimate:', estimateError);
        throw estimateError;
      }

      // Insert items
      const itemsToInsert = estimate.items.map(item => ({
        estimate_id: newEstimate.id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating estimate items:', itemsError);
        // Try to delete the estimate if items insertion fails
        await supabase.from('estimates').delete().eq('id', newEstimate.id);
        throw itemsError;
      }

      // Return the complete estimate
      const result = await this.getById(newEstimate.id);
      if (!result) {
        throw new Error('Failed to retrieve created estimate');
      }
      return result;
    } catch (error) {
      console.error('Error creating estimate:', error);
      throw error;
    }
  },

  /**
   * Update estimate
   */
  async update(id: string, estimate: {
    date?: string;
    status?: Estimate['status'];
    note?: string;
    items?: Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }): Promise<EstimateWithItems> {
    try {
      const supabase = getSupabaseClient();
      
      // If items are provided, recalculate totals
      let updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (estimate.date) updateData.date = estimate.date;
      if (estimate.status) updateData.status = estimate.status;
      if (estimate.note !== undefined) updateData.note = estimate.note;

      if (estimate.items) {
        const subtotal = estimate.items.reduce(
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
          .from('estimate_items')
          .delete()
          .eq('estimate_id', id);

        const itemsToInsert = estimate.items.map(item => ({
          estimate_id: id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('estimate_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error updating estimate items:', itemsError);
          throw itemsError;
        }
      }

      const { data, error } = await supabase
        .from('estimates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating estimate:', error);
        throw error;
      }
      
      const result = await this.getById(id);
      if (!result) {
        throw new Error('Failed to retrieve updated estimate');
      }
      return result;
    } catch (error) {
      console.error('Error updating estimate:', error);
      throw error;
    }
  },

  /**
   * Update estimate status
   */
  async updateStatus(id: string, status: Estimate['status']): Promise<Estimate> {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('estimates')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating estimate status:', error);
        throw error;
      }
      
      return data as Estimate;
    } catch (error) {
      console.error('Error updating estimate status:', error);
      throw error;
    }
  },

  /**
   * Delete estimate
   */
  async delete(id: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Delete items first (if cascade is not enabled)
      await supabase
        .from('estimate_items')
        .delete()
        .eq('estimate_id', id);
      
      // Delete estimate
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting estimate:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting estimate:', error);
      throw error;
    }
  },
};
