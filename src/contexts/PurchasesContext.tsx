/**
 * Purchases Context
 * Manages all purchase documents (purchase orders, purchase invoices, delivery notes)
 * Unified interface for the Purchases page
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersService, PurchaseOrderWithItems } from '@/services/purchase-orders.service';
import { purchaseInvoicesService, PurchaseInvoiceWithItems } from '@/services/purchase-invoices.service';
import { deliveryNotesService, DeliveryNoteWithItems } from '@/services/delivery-notes.service';
import { useToast } from '@/hooks/use-toast';
import { 
  mapPurchaseOrderStatus,
  mapPurchaseOrderStatusToUI,
  mapPurchaseInvoiceStatus,
  mapPurchaseInvoiceStatusToUI,
  mapDeliveryNoteStatus,
  mapDeliveryNoteStatusToUI
} from '@/lib/status-mapper';

// UI-friendly Purchase Document interface (matches Purchases page)
export interface PurchaseItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseDocument {
  id: string; // document_id
  documentId: string; // document_id (alias)
  supplier: string; // supplier name or ID
  supplierData?: {
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
  items: PurchaseItem[];
  total: number;
  status: string;
  type: 'purchase_order' | 'delivery_note' | 'invoice' | 'statement';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  dueDate?: string;
  note?: string;
  // Additional fields for internal use
  _internalId?: string; // database ID
}

interface PurchasesContextType {
  // Documents by type
  purchaseOrders: PurchaseDocument[];
  purchaseInvoices: PurchaseDocument[];
  deliveryNotes: PurchaseDocument[];
  
  // Loading state
  isLoading: boolean;
  
  // CRUD operations
  createPurchaseOrder: (data: Omit<PurchaseDocument, 'id' | 'type'>) => Promise<void>;
  updatePurchaseOrder: (id: string, data: Partial<PurchaseDocument>) => Promise<void>;
  deletePurchaseOrder: (id: string) => Promise<void>;
  
  createPurchaseInvoice: (data: Omit<PurchaseDocument, 'id' | 'type'>) => Promise<void>;
  updatePurchaseInvoice: (id: string, data: Partial<PurchaseDocument>) => Promise<void>;
  deletePurchaseInvoice: (id: string) => Promise<void>;
  
  createDeliveryNote: (data: Omit<PurchaseDocument, 'id' | 'type'>) => Promise<void>;
  updateDeliveryNote: (id: string, data: Partial<PurchaseDocument>) => Promise<void>;
  deleteDeliveryNote: (id: string) => Promise<void>;
  
  // Refresh data
  refreshAll: () => Promise<void>;
}

const PurchasesContext = createContext<PurchasesContextType | undefined>(undefined);

// Helper to convert purchase order to PurchaseDocument
const purchaseOrderToPurchaseDocument = (po: PurchaseOrderWithItems): PurchaseDocument => ({
  id: po.document_id,
  documentId: po.document_id,
  supplier: po.supplier?.name || po.supplier_id,
  supplierData: po.supplier,
  date: po.date,
  items: po.items.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
  })),
  total: po.subtotal,
  status: mapPurchaseOrderStatusToUI(po.status),
  type: 'purchase_order',
  note: po.note || undefined,
  _internalId: po.id,
});

// Helper to convert purchase invoice to PurchaseDocument
const purchaseInvoiceToPurchaseDocument = (pi: PurchaseInvoiceWithItems): PurchaseDocument => ({
  id: pi.document_id,
  documentId: pi.document_id,
  supplier: pi.supplier?.name || pi.supplier_id,
  supplierData: pi.supplier,
  date: pi.date,
  items: pi.items.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
  })),
  total: pi.total,
  status: mapPurchaseInvoiceStatusToUI(pi.status),
  type: 'invoice',
  paymentMethod: pi.payment_method || undefined,
  dueDate: pi.due_date || undefined,
  note: pi.note || undefined,
  _internalId: pi.id,
});

// Helper to convert delivery note to PurchaseDocument (for purchases, uses supplier_id)
const deliveryNoteToPurchaseDocument = (dn: DeliveryNoteWithItems): PurchaseDocument => ({
  id: dn.document_id,
  documentId: dn.document_id,
  supplier: dn.supplier?.name || dn.supplier_id || '',
  supplierData: dn.supplier,
  date: dn.date,
  items: dn.items.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
  })),
  total: dn.subtotal,
  status: mapDeliveryNoteStatusToUI(dn.status),
  type: 'delivery_note',
  note: dn.note || undefined,
  _internalId: dn.id,
});

export const PurchasesProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch purchase orders
  const { data: purchaseOrdersData = [], isLoading: isLoadingPO } = useQuery({
    queryKey: ['purchases', 'purchase_orders'],
    queryFn: () => purchaseOrdersService.getAll(),
  });

  // Fetch purchase invoices
  const { data: purchaseInvoicesData = [], isLoading: isLoadingPI } = useQuery({
    queryKey: ['purchases', 'purchase_invoices'],
    queryFn: () => purchaseInvoicesService.getAll(),
  });

  // Fetch delivery notes (purchase delivery notes - filtered by supplier_id)
  const { data: deliveryNotesData = [], isLoading: isLoadingDN } = useQuery({
    queryKey: ['purchases', 'delivery_notes'],
    queryFn: () => deliveryNotesService.getAll({ supplierId: undefined }), // Fetch all, filter by supplier_id not null
  });

  // Convert to UI format
  const purchaseOrders = useMemo(
    () => purchaseOrdersData.map(purchaseOrderToPurchaseDocument),
    [purchaseOrdersData]
  );

  const purchaseInvoices = useMemo(
    () => purchaseInvoicesData.map(purchaseInvoiceToPurchaseDocument),
    [purchaseInvoicesData]
  );

  // Filter delivery notes to only include those with supplier_id (purchase delivery notes)
  const purchaseDeliveryNotes = useMemo(
    () => deliveryNotesData
      .filter(dn => dn.supplier_id) // Only delivery notes with supplier_id (purchase delivery notes)
      .map(deliveryNoteToPurchaseDocument),
    [deliveryNotesData]
  );

  const isLoading = isLoadingPO || isLoadingPI || isLoadingDN;

  // Mutations for purchase orders
  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (data: Omit<PurchaseDocument, 'id' | 'type'>) => {
      // Validate and get supplier UUID
      const supplierId = data.supplierData?.id || (typeof data.supplier === 'string' ? data.supplier : null);
      
      if (!supplierId) {
        throw new Error('Supplier is required');
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(supplierId)) {
        throw new Error(`Invalid supplier ID format. Expected UUID, got: ${supplierId}. Please select a valid supplier from the database.`);
      }
      
      return purchaseOrdersService.create({
        document_id: data.documentId || `PO-${Date.now()}`,
        supplier_id: supplierId,
        date: data.date,
        subtotal: data.total,
        status: data.status as any,
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
      queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_orders'] });
      toast({ title: 'Purchase order created successfully' });
    },
    onError: (error: Error) => {
      // Check if it's a duplicate key error
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({ 
          title: 'Error creating purchase order', 
          description: 'A document with this number already exists. Please try again.', 
          variant: 'destructive' 
        });
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_orders'] });
      } else {
        toast({ title: 'Error creating purchase order', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updatePurchaseOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseDocument> }) => {
      const po = purchaseOrders.find(po => po.id === id || po._internalId === id);
      if (!po?._internalId) {
        throw new Error('Purchase order not found');
      }
      
      return purchaseOrdersService.update(po._internalId, {
        date: data.date,
        subtotal: data.total,
        status: data.status ? mapPurchaseOrderStatus(data.status) : undefined,
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
      queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_orders'] });
      toast({ title: 'Purchase order updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating purchase order', description: error.message, variant: 'destructive' });
    },
  });

  const deletePurchaseOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const po = purchaseOrders.find(po => po.id === id || po._internalId === id);
      if (!po?._internalId) {
        throw new Error('Purchase order not found');
      }
      return purchaseOrdersService.delete(po._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_orders'] });
      toast({ title: 'Purchase order deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting purchase order', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for purchase invoices
  const createPurchaseInvoiceMutation = useMutation({
    mutationFn: async (data: Omit<PurchaseDocument, 'id' | 'type'>) => {
      // Validate and get supplier UUID
      const supplierId = data.supplierData?.id || (typeof data.supplier === 'string' ? data.supplier : null);
      
      if (!supplierId) {
        throw new Error('Supplier is required');
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(supplierId)) {
        throw new Error(`Invalid supplier ID format. Expected UUID, got: ${supplierId}. Please select a valid supplier from the database.`);
      }
      
      // Calculate VAT (20% for Morocco)
      const vatRate = 20.00;
      const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;
      
      return purchaseInvoicesService.create({
        document_id: data.documentId || `PI-${Date.now()}`,
        supplier_id: supplierId,
        date: data.date,
        due_date: data.dueDate,
        subtotal: subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total: total,
        payment_method: data.paymentMethod,
        status: data.status as any,
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
      queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_invoices'] });
      toast({ title: 'Purchase invoice created successfully' });
    },
    onError: (error: Error) => {
      // Check if it's a duplicate key error
      if (error.message.includes('duplicate key') || error.message.includes('document_id_key')) {
        toast({ 
          title: 'Error creating purchase invoice', 
          description: 'A document with this number already exists. Please try again.', 
          variant: 'destructive' 
        });
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_invoices'] });
      } else {
        toast({ title: 'Error creating purchase invoice', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updatePurchaseInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseDocument> }) => {
      const pi = purchaseInvoices.find(pi => pi.id === id || pi._internalId === id);
      if (!pi?._internalId) {
        throw new Error('Purchase invoice not found');
      }
      
      // Recalculate totals if items changed
      let updateData: any = {
        date: data.date,
        due_date: data.dueDate,
        payment_method: data.paymentMethod,
        status: data.status ? mapPurchaseInvoiceStatus(data.status) : undefined,
        note: data.note,
      };
      
      if (data.items) {
        const vatRate = 20.00;
        const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;
        updateData.subtotal = subtotal;
        updateData.vat_rate = vatRate;
        updateData.vat_amount = vatAmount;
        updateData.total = total;
        updateData.items = data.items.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }));
      }
      
      return purchaseInvoicesService.update(pi._internalId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_invoices'] });
      toast({ title: 'Purchase invoice updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating purchase invoice', description: error.message, variant: 'destructive' });
    },
  });

  const deletePurchaseInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const pi = purchaseInvoices.find(pi => pi.id === id || pi._internalId === id);
      if (!pi?._internalId) {
        throw new Error('Purchase invoice not found');
      }
      return purchaseInvoicesService.delete(pi._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_invoices'] });
      toast({ title: 'Purchase invoice deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting purchase invoice', description: error.message, variant: 'destructive' });
    },
  });

  // Mutations for delivery notes (purchase delivery notes - use supplier_id)
  const createDeliveryNoteMutation = useMutation({
    mutationFn: async (data: Omit<PurchaseDocument, 'id' | 'type'>) => {
      if (!data.supplierData?.id && !data.supplier) {
        throw new Error('Supplier is required');
      }
      const supplierId = data.supplierData?.id || data.supplier;
      
      return deliveryNotesService.create({
        document_id: data.documentId || `DN-${Date.now()}`,
        supplier_id: supplierId,
        date: data.date,
        subtotal: data.total,
        status: data.status as any,
        note: data.note,
        document_type: 'delivery_note',
        items: data.items.map(item => ({
          product_id: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', 'delivery_notes'] });
      toast({ title: 'Delivery note created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating delivery note', description: error.message, variant: 'destructive' });
    },
  });

  const updateDeliveryNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseDocument> }) => {
      const dn = purchaseDeliveryNotes.find(dn => dn.id === id || dn._internalId === id);
      if (!dn?._internalId) {
        throw new Error('Delivery note not found');
      }
      
      return deliveryNotesService.update(dn._internalId, {
        date: data.date,
        subtotal: data.total,
        status: data.status as any,
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
      queryClient.invalidateQueries({ queryKey: ['purchases', 'delivery_notes'] });
      toast({ title: 'Delivery note updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating delivery note', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDeliveryNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const dn = purchaseDeliveryNotes.find(dn => dn.id === id || dn._internalId === id);
      if (!dn?._internalId) {
        throw new Error('Delivery note not found');
      }
      return deliveryNotesService.delete(dn._internalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', 'delivery_notes'] });
      toast({ title: 'Delivery note deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting delivery note', description: error.message, variant: 'destructive' });
    },
  });

  const value: PurchasesContextType = useMemo(
    () => ({
      purchaseOrders,
      purchaseInvoices,
      deliveryNotes: purchaseDeliveryNotes,
      isLoading,
      createPurchaseOrder: (data) => createPurchaseOrderMutation.mutateAsync(data),
      updatePurchaseOrder: (id, data) => updatePurchaseOrderMutation.mutateAsync({ id, data }),
      deletePurchaseOrder: (id) => deletePurchaseOrderMutation.mutateAsync(id),
      createPurchaseInvoice: (data) => createPurchaseInvoiceMutation.mutateAsync(data),
      updatePurchaseInvoice: (id, data) => updatePurchaseInvoiceMutation.mutateAsync({ id, data }),
      deletePurchaseInvoice: (id) => deletePurchaseInvoiceMutation.mutateAsync(id),
      createDeliveryNote: (data) => createDeliveryNoteMutation.mutateAsync(data),
      updateDeliveryNote: (id, data) => updateDeliveryNoteMutation.mutateAsync({ id, data }),
      deleteDeliveryNote: (id) => deleteDeliveryNoteMutation.mutateAsync(id),
      refreshAll: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_orders'] }),
          queryClient.invalidateQueries({ queryKey: ['purchases', 'purchase_invoices'] }),
          queryClient.invalidateQueries({ queryKey: ['purchases', 'delivery_notes'] }),
        ]);
      },
    }),
    [
      purchaseOrders,
      purchaseInvoices,
      purchaseDeliveryNotes,
      isLoading,
      createPurchaseOrderMutation,
      updatePurchaseOrderMutation,
      deletePurchaseOrderMutation,
      createPurchaseInvoiceMutation,
      updatePurchaseInvoiceMutation,
      deletePurchaseInvoiceMutation,
      createDeliveryNoteMutation,
      updateDeliveryNoteMutation,
      deleteDeliveryNoteMutation,
      queryClient,
    ]
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
};

export const usePurchases = () => {
  const context = useContext(PurchasesContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchasesProvider');
  }
  return context;
};
