/**
 * Sales Context
 * Manages all sales documents (invoices, estimates, delivery notes, credit notes, divers)
 * Unified interface for the Sales page
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesService, InvoiceWithItems } from '@/services/invoices.service';
import { estimatesService, EstimateWithItems } from '@/services/estimates.service';
import { deliveryNotesService, DeliveryNoteWithItems } from '@/services/delivery-notes.service';
import { creditNotesService, CreditNoteWithItems } from '@/services/credit-notes.service';
import { 
  mapInvoiceStatus, 
  mapInvoiceStatusToUI,
  mapEstimateStatus, 
  mapEstimateStatusToUI,
  mapDeliveryNoteStatus, 
  mapDeliveryNoteStatusToUI,
  mapCreditNoteStatus,
  mapCreditNoteStatusToUI
} from '@/lib/status-mapper';
import { useToast } from '@/hooks/use-toast';

// UI-friendly Sales Document interface (matches Sales page)
export interface SalesItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SalesDocument {
  id: string; // document_id
  documentId: string; // document_id (alias)
  client: string; // client name or ID
  clientData?: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    ice: string | null;
    if_number: string | null;
    rc: string | null;
  };
  date: string;
  items: SalesItem[];
  total: number;
  status: string;
  type: 'delivery_note' | 'divers' | 'invoice' | 'estimate' | 'credit_note' | 'statement';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  dueDate?: string;
  note?: string;
  taxEnabled?: boolean; // For divers documents
  // Additional fields for internal use
  _internalId?: string; // database ID
}

interface SalesContextType {
  // Documents by type
  invoices: SalesDocument[];
  estimates: SalesDocument[];
  deliveryNotes: SalesDocument[];
  divers: SalesDocument[];
  creditNotes: SalesDocument[];
  
  // Loading state
  isLoading: boolean;
  
  // CRUD operations
  createInvoice: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateInvoice: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  
  createEstimate: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateEstimate: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteEstimate: (id: string) => Promise<void>;
  
  createDeliveryNote: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateDeliveryNote: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteDeliveryNote: (id: string) => Promise<void>;
  
  createDivers: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateDivers: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteDivers: (id: string) => Promise<void>;
  
  createCreditNote: (data: Omit<SalesDocument, 'id' | 'type'>) => Promise<void>;
  updateCreditNote: (id: string, data: Partial<SalesDocument>) => Promise<void>;
  deleteCreditNote: (id: string) => Promise<void>;
  
  // Refresh data
  refreshAll: () => Promise<void>;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

// Helper to convert invoice to SalesDocument
const invoiceToSalesDocument = (invoice: InvoiceWithItems): SalesDocument => ({
  id: invoice.document_id,
  documentId: invoice.document_id,
  client: invoice.client?.name || invoice.client_id,
  clientData: invoice.client,
  date: invoice.date,
  items: invoice.items.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
  })),
  total: invoice.total,
  status: mapInvoiceStatusToUI(invoice.status),
  type: 'invoice',
  paymentMethod: invoice.payment_method || undefined,
  dueDate: invoice.due_date || undefined,
  note: invoice.note || undefined,
  _internalId: invoice.id,
});

// Helper to convert estimate to SalesDocument
const estimateToSalesDocument = (estimate: EstimateWithItems): SalesDocument => ({
  id: estimate.document_id,
  documentId: estimate.document_id,
  client: estimate.client?.name || estimate.client_id,
  clientData: estimate.client,
  date: estimate.date,
  items: estimate.items.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
  })),
  total: estimate.total,
  status: mapEstimateStatusToUI(estimate.status),
  type: 'estimate',
  note: estimate.note || undefined,
  _internalId: estimate.id,
});

// Helper to convert delivery note to SalesDocument
const deliveryNoteToSalesDocument = (deliveryNote: DeliveryNoteWithItems): SalesDocument => ({
  id: deliveryNote.document_id,
  documentId: deliveryNote.document_id,
  client: deliveryNote.client?.name || deliveryNote.client_id || deliveryNote.supplier?.name || deliveryNote.supplier_id || '',
  clientData: deliveryNote.client || deliveryNote.supplier,
  date: deliveryNote.date,
  items: deliveryNote.items.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
  })),
  total: deliveryNote.subtotal, // Delivery notes use subtotal
  status: mapDeliveryNoteStatusToUI(deliveryNote.status),
  type: deliveryNote.document_type === 'divers' ? 'divers' : 'delivery_note',
  note: deliveryNote.note || undefined,
  _internalId: deliveryNote.id,
});

// Helper to convert credit note to SalesDocument
const creditNoteToSalesDocument = (creditNote: CreditNoteWithItems): SalesDocument => ({
  id: creditNote.document_id,
  documentId: creditNote.document_id,
  client: creditNote.client?.name || creditNote.client_id,
  clientData: creditNote.client,
  date: creditNote.date,
  items: creditNote.items.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
  })),
  total: creditNote.total,
  status: mapCreditNoteStatusToUI(creditNote.status),
  type: 'credit_note',
  note: creditNote.note || undefined,
  _internalId: creditNote.id,
});

export const SalesProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch invoices
  const { data: invoicesData = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['sales', 'invoices'],
    queryFn: () => invoicesService.getAll(),
    staleTime: 30000,
  });

  // Fetch estimates
  const { data: estimatesData = [], isLoading: isLoadingEstimates } = useQuery({
    queryKey: ['sales', 'estimates'],
    queryFn: () => estimatesService.getAll(),
    staleTime: 30000,
  });

  // Fetch delivery notes (includes both delivery_note and divers)
  const { data: deliveryNotesData = [], isLoading: isLoadingDeliveryNotes } = useQuery({
    queryKey: ['sales', 'deliveryNotes'],
    queryFn: () => deliveryNotesService.getAll(),
    staleTime: 30000,
  });

  // Fetch credit notes
  const { data: creditNotesData = [], isLoading: isLoadingCreditNotes } = useQuery({
    queryKey: ['sales', 'creditNotes'],
    queryFn: () => creditNotesService.getAll(),
    staleTime: 30000,
  });

  const isLoading = isLoadingInvoices || isLoadingEstimates || isLoadingDeliveryNotes || isLoadingCreditNotes;

  // Convert to SalesDocument format
  const invoices: SalesDocument[] = useMemo(
    () => invoicesData.map(invoiceToSalesDocument),
    [invoicesData]
  );

  const estimates: SalesDocument[] = useMemo(
    () => estimatesData.map(estimateToSalesDocument),
    [estimatesData]
  );

  const allDeliveryNotes: SalesDocument[] = useMemo(
    () => deliveryNotesData.map(deliveryNoteToSalesDocument),
    [deliveryNotesData]
  );

  const deliveryNotes: SalesDocument[] = useMemo(
    () => allDeliveryNotes.filter(doc => doc.type === 'delivery_note'),
    [allDeliveryNotes]
  );

  const divers: SalesDocument[] = useMemo(
    () => allDeliveryNotes.filter(doc => doc.type === 'divers'),
    [allDeliveryNotes]
  );

  const creditNotes: SalesDocument[] = useMemo(
    () => creditNotesData.map(creditNoteToSalesDocument),
    [creditNotesData]
  );

  // Mutations for invoices
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);
      
      if (!clientId) {
        throw new Error('Client is required');
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }
      
      return invoicesService.create({
        document_id: data.documentId || `INV-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        due_date: data.dueDate,
        payment_method: data.paymentMethod,
        note: data.note,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      toast({ title: 'Invoice created successfully' });
    },
    onError: (error: Error) => {
      // Check if it's a duplicate key error
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({ 
          title: 'Error creating invoice', 
          description: 'A document with this number already exists. Please try again.', 
          variant: 'destructive' 
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      } else {
        toast({ title: 'Error creating invoice', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const invoice = invoices.find(inv => inv.id === id || inv._internalId === id);
      if (!invoice?._internalId) {
        throw new Error('Invoice not found');
      }
      
      return invoicesService.update(invoice._internalId, {
        date: data.date,
        status: data.status ? mapInvoiceStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      toast({ title: 'Invoice updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating invoice', description: error.message, variant: 'destructive' });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const invoice = invoices.find(inv => inv.id === id || inv._internalId === id);
      if (!invoice?._internalId) {
        throw new Error('Invoice not found');
      }
      return invoicesService.delete(invoice._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] });
      toast({ title: 'Invoice deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting invoice', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for estimates
  const createEstimateMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);
      
      if (!clientId) {
        throw new Error('Client is required');
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }
      
      return estimatesService.create({
        document_id: data.documentId || `EST-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        note: data.note,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] });
      toast({ title: 'Estimate created successfully' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({ 
          title: 'Error creating estimate', 
          description: 'A document with this number already exists. Please try again.', 
          variant: 'destructive' 
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] });
      } else {
        toast({ title: 'Error creating estimate', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateEstimateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const estimate = estimates.find(est => est.id === id || est._internalId === id);
      if (!estimate?._internalId) {
        throw new Error('Estimate not found');
      }
      
      return estimatesService.update(estimate._internalId, {
        date: data.date,
        status: data.status ? mapEstimateStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] });
      toast({ title: 'Estimate updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating estimate', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEstimateMutation = useMutation({
    mutationFn: async (id: string) => {
      const estimate = estimates.find(est => est.id === id || est._internalId === id);
      if (!estimate?._internalId) {
        throw new Error('Estimate not found');
      }
      return estimatesService.delete(estimate._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] });
      toast({ title: 'Estimate deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting estimate', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for delivery notes
  const createDeliveryNoteMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);
      
      if (!clientId) {
        throw new Error('Client is required');
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }
      
      return deliveryNotesService.create({
        document_id: data.documentId || `DN-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        document_type: 'delivery_note',
        note: data.note,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      toast({ title: 'Delivery note created successfully' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({ 
          title: 'Error creating delivery note', 
          description: 'A document with this number already exists. Please try again.', 
          variant: 'destructive' 
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      } else {
        toast({ title: 'Error creating delivery note', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateDeliveryNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const deliveryNote = deliveryNotes.find(dn => dn.id === id || dn._internalId === id);
      if (!deliveryNote?._internalId) {
        throw new Error('Delivery note not found');
      }
      
      return deliveryNotesService.update(deliveryNote._internalId, {
        date: data.date,
        status: data.status ? mapDeliveryNoteStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      toast({ title: 'Delivery note updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating delivery note', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDeliveryNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const deliveryNote = deliveryNotes.find(dn => dn.id === id || dn._internalId === id);
      if (!deliveryNote?._internalId) {
        throw new Error('Delivery note not found');
      }
      return deliveryNotesService.delete(deliveryNote._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      toast({ title: 'Delivery note deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting delivery note', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for divers (same as delivery notes but with document_type='divers')
  const createDiversMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);
      
      if (!clientId) {
        throw new Error('Client is required');
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }
      
      return deliveryNotesService.create({
        document_id: data.documentId || `DIV-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        document_type: 'divers',
        note: data.note,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      toast({ title: 'Divers document created successfully' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({ 
          title: 'Error creating divers document', 
          description: 'A document with this number already exists. Please try again.', 
          variant: 'destructive' 
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      } else {
        toast({ title: 'Error creating divers document', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateDiversMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const diversDoc = divers.find(div => div.id === id || div._internalId === id);
      if (!diversDoc?._internalId) {
        throw new Error('Divers document not found');
      }
      
      return deliveryNotesService.update(diversDoc._internalId, {
        date: data.date,
        status: data.status ? mapDeliveryNoteStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      toast({ title: 'Divers document updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating divers document', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDiversMutation = useMutation({
    mutationFn: async (id: string) => {
      const diversDoc = divers.find(div => div.id === id || div._internalId === id);
      if (!diversDoc?._internalId) {
        throw new Error('Divers document not found');
      }
      return deliveryNotesService.delete(diversDoc._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] });
      toast({ title: 'Divers document deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting divers document', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for credit notes
  const createCreditNoteMutation = useMutation({
    mutationFn: async (data: Omit<SalesDocument, 'id' | 'type'>) => {
      // Validate and get client UUID
      const clientId = data.clientData?.id || (typeof data.client === 'string' ? data.client : null);
      
      if (!clientId) {
        throw new Error('Client is required');
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clientId)) {
        throw new Error(`Invalid client ID format. Expected UUID, got: ${clientId}. Please select a valid client from the database.`);
      }
      
      return creditNotesService.create({
        document_id: data.documentId || `CN-${Date.now()}`,
        client_id: clientId,
        date: data.date,
        note: data.note,
        items: data.items.map(item => ({
          product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] });
      toast({ title: 'Credit note created successfully' });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({ 
          title: 'Error creating credit note', 
          description: 'A document with this number already exists. Please try again.', 
          variant: 'destructive' 
        });
        queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] });
      } else {
        toast({ title: 'Error creating credit note', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateCreditNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesDocument> }) => {
      const creditNote = creditNotes.find(cn => cn.id === id || cn._internalId === id);
      if (!creditNote?._internalId) {
        throw new Error('Credit note not found');
      }
      
      return creditNotesService.update(creditNote._internalId, {
        date: data.date,
        status: data.status ? mapCreditNoteStatus(data.status) : undefined,
        note: data.note,
        items: data.items?.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] });
      toast({ title: 'Credit note updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating credit note', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCreditNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const creditNote = creditNotes.find(cn => cn.id === id || cn._internalId === id);
      if (!creditNote?._internalId) {
        throw new Error('Credit note not found');
      }
      return creditNotesService.delete(creditNote._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] });
      toast({ title: 'Credit note deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting credit note', description: error.message, variant: 'destructive' });
    },
  });

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sales', 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['sales', 'estimates'] }),
      queryClient.invalidateQueries({ queryKey: ['sales', 'deliveryNotes'] }),
      queryClient.invalidateQueries({ queryKey: ['sales', 'creditNotes'] }),
    ]);
  };

  const value: SalesContextType = {
    invoices,
    estimates,
    deliveryNotes,
    divers,
    creditNotes,
    isLoading,
    createInvoice: createInvoiceMutation.mutateAsync,
    updateInvoice: (id, data) => updateInvoiceMutation.mutateAsync({ id, data }),
    deleteInvoice: deleteInvoiceMutation.mutateAsync,
    createEstimate: createEstimateMutation.mutateAsync,
    updateEstimate: (id, data) => updateEstimateMutation.mutateAsync({ id, data }),
    deleteEstimate: deleteEstimateMutation.mutateAsync,
    createDeliveryNote: createDeliveryNoteMutation.mutateAsync,
    updateDeliveryNote: (id, data) => updateDeliveryNoteMutation.mutateAsync({ id, data }),
    deleteDeliveryNote: deleteDeliveryNoteMutation.mutateAsync,
    createDivers: createDiversMutation.mutateAsync,
    updateDivers: (id, data) => updateDiversMutation.mutateAsync({ id, data }),
    deleteDivers: deleteDiversMutation.mutateAsync,
    createCreditNote: createCreditNoteMutation.mutateAsync,
    updateCreditNote: (id, data) => updateCreditNoteMutation.mutateAsync({ id, data }),
    deleteCreditNote: deleteCreditNoteMutation.mutateAsync,
    refreshAll,
  };

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export const useSales = () => {
  const context = useContext(SalesContext);
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};
