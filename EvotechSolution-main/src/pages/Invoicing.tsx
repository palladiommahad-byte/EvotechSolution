import React, { useState } from 'react';
import { Plus, Search, TrendingUp, FileText, Download, Receipt, Package, ShoppingCart, FileCheck, Calculator, Trash2, Send, Users, Eye, Edit, CheckSquare, Square, Check, FileSpreadsheet, ChevronDown, Printer, FileX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ToastAction } from '@/components/ui/toast';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMAD, VAT_RATE, calculateInvoiceTotals } from '@/lib/moroccan-utils';
import { ProductSearch } from '@/components/ui/product-search';
import { Product } from '@/lib/products';
import { useProducts } from '@/contexts/ProductsContext';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { useContacts, UIContact } from '@/contexts/ContactsContext';
import { useSales } from '@/contexts/SalesContext';
import { usePurchases } from '@/contexts/PurchasesContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';
import { generateDocumentNumber } from '@/lib/document-number-generator';
import {
  generateInvoicePDF,
  generateEstimatePDF,
  generatePurchaseOrderPDF,
  generateDeliveryNotePDF,
  generateStatementPDF,
} from '@/lib/pdf-generator';
import {
  generateDocumentExcel,
  generateBulkDocumentsExcel,
} from '@/lib/excel-generator';
import {
  generateDocumentCSV,
  generateBulkDocumentsCSV,
} from '@/lib/csv-generator';

interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceDocument {
  id: string;
  client?: string;
  supplier?: string;
  clientData?: UIContact; // Full client information from CRM
  supplierData?: UIContact; // Full supplier information from CRM
  date: string;
  items: number | InvoiceItem[]; // Can be count or full items array
  total: number;
  status: string;
  type: 'invoice' | 'estimate' | 'purchase_order' | 'delivery_note' | 'statement';
  paymentMethod?: 'cash' | 'check' | 'bank_transfer';
  note?: string;
  dueDate?: string;
}

// Mock data removed - all data now comes from database

export const Invoicing = () => {
  const { t } = useTranslation();
  const { clients, suppliers, getClientById, getSupplierById } = useContacts();
  const { products = [] } = useProducts();
  const { companyInfo } = useCompany();
  const { toast } = useToast();

  // Use contexts for real data
  const {
    invoices,
    estimates,
    deliveryNotes,
    divers,
    isLoading: isLoadingSales,
    deleteInvoice,
    updateInvoice,
    createInvoice,
    deleteEstimate,
    updateEstimate,
    createEstimate,
    deleteDeliveryNote,
    updateDeliveryNote,
    createDeliveryNote,
    deleteDivers,
    updateDivers,
    createDivers,
  } = useSales();

  const {
    purchaseOrders,
    purchaseInvoices,
    isLoading: isLoadingPurchases,
    deletePurchaseOrder,
    updatePurchaseOrder,
    createPurchaseOrder,
    deletePurchaseInvoice,
    updatePurchaseInvoice,
    createPurchaseInvoice,
  } = usePurchases();

  // Convert SalesDocument to InvoiceDocument format for compatibility
  const convertToInvoiceDocument = (doc: any): InvoiceDocument => ({
    id: doc.id || doc.documentId,
    client: doc.client,
    clientData: doc.clientData,
    date: doc.date,
    items: doc.items,
    total: doc.total,
    status: doc.status,
    type: doc.type === 'divers' ? 'delivery_note' : doc.type,
    paymentMethod: doc.paymentMethod,
    note: doc.note,
    dueDate: doc.dueDate,
  });

  // Convert PurchaseDocument to InvoiceDocument format
  const convertPurchaseToInvoiceDocument = (doc: any): InvoiceDocument => ({
    id: doc.id || doc.documentId,
    supplier: doc.supplier,
    supplierData: doc.supplierData,
    date: doc.date,
    items: doc.items,
    total: doc.total || doc.subtotal,
    status: doc.status,
    type: doc.type === 'purchase_order' ? 'purchase_order' : 'invoice',
    paymentMethod: doc.paymentMethod,
    note: doc.note,
    dueDate: doc.dueDate,
  });

  // Map context data to InvoiceDocument format
  const mockFactures = invoices.map(convertToInvoiceDocument);
  const mockEstimates = estimates.map(convertToInvoiceDocument);
  const mockDeliveryNotes = [...deliveryNotes, ...divers].map(convertToInvoiceDocument);
  const mockPurchaseOrders = purchaseOrders.map(convertPurchaseToInvoiceDocument);
  const mockStatements: InvoiceDocument[] = []; // Statements not implemented yet
  const [documentType, setDocumentType] = useState<'invoice' | 'estimate' | 'purchase_order' | 'delivery_note' | 'statement'>('invoice');
  const [activeTab, setActiveTab] = useState<'invoice' | 'estimate' | 'purchase_order' | 'delivery_note' | 'statement'>('invoice');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [viewingDocument, setViewingDocument] = useState<InvoiceDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<InvoiceDocument | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<InvoiceDocument>>({});
  const [deletingDocument, setDeletingDocument] = useState<InvoiceDocument | null>(null);
  const [formClient, setFormClient] = useState(''); // Store client ID
  const [formSupplier, setFormSupplier] = useState(''); // Store supplier ID
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'check' | 'bank_transfer'>('cash');
  const [formNote, setFormNote] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const handleDeleteDocument = (doc: InvoiceDocument) => {
    setDeletingDocument(doc);
  };

  const confirmDeleteDocument = async () => {
    if (!deletingDocument) return;

    const documentTypeNames: Record<string, string> = {
      'invoice': 'Invoice',
      'estimate': 'Estimate',
      'purchase_order': 'Purchase Order',
      'delivery_note': 'Delivery Note',
      'statement': 'Statement',
    };

    try {
      switch (activeTab) {
        case 'invoice':
          await deleteInvoice(deletingDocument.id);
          break;
        case 'estimate':
          await deleteEstimate(deletingDocument.id);
          break;
        case 'purchase_order':
          await deletePurchaseOrder(deletingDocument.id);
          break;
        case 'delivery_note':
          // Check if it's a divers or delivery_note
          const isDivers = divers.some(d => d.id === deletingDocument.id);
          if (isDivers) {
            await deleteDivers(deletingDocument.id);
          } else {
            await deleteDeliveryNote(deletingDocument.id);
          }
          break;
        case 'statement':
          // Statements not implemented yet
          toast({
            title: "Not Supported",
            description: "Statement deletion is not yet implemented.",
            variant: "destructive",
          });
          return;
      }

      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletingDocument.id);
        return newSet;
      });

      const docTypeName = documentTypeNames[deletingDocument.type] || 'Document';
      setDeletingDocument(null);

      toast({
        title: "Document Deleted",
        description: `${docTypeName} "${deletingDocument.id}" has been deleted successfully.`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;

    const documentTypeNames: Record<string, string> = {
      'invoice': 'Invoices',
      'estimate': 'Estimates',
      'purchase_order': 'Purchase Orders',
      'delivery_note': 'Delivery Notes',
      'statement': 'Statements',
    };

    const selectedIds = Array.from(selectedDocuments);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const id of selectedIds) {
        try {
          switch (activeTab) {
            case 'invoice':
              await deleteInvoice(id);
              successCount++;
              break;
            case 'estimate':
              await deleteEstimate(id);
              successCount++;
              break;
            case 'purchase_order':
              await deletePurchaseOrder(id);
              successCount++;
              break;
            case 'delivery_note':
              const isDivers = divers.some(d => d.id === id);
              if (isDivers) {
                await deleteDivers(id);
              } else {
                await deleteDeliveryNote(id);
              }
              successCount++;
              break;
            case 'statement':
              // Statements not implemented
              errorCount++;
              break;
          }
        } catch (error) {
          errorCount++;
          console.error(`Failed to delete ${id}:`, error);
        }
      }

      const count = successCount;
      const docTypeName = documentTypeNames[activeTab] || 'Documents';
      setSelectedDocuments(new Set());

      if (successCount > 0) {
        toast({
          title: "Documents Deleted",
          description: `${count} ${docTypeName} have been deleted successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
          variant: errorCount > 0 ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to delete documents.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async (doc: InvoiceDocument & { items?: any }) => {
    try {
      const docType = doc.type || activeTab;

      // If clientData/supplierData is missing, try to find it from CRM using client/supplier name
      let docWithClientData = { ...doc };
      if (!docWithClientData.clientData && docWithClientData.client) {
        // Try to find client by matching company or name
        const foundClient = clients.find(c =>
          c.company === docWithClientData.client ||
          c.name === docWithClientData.client
        );
        if (foundClient) {
          docWithClientData.clientData = foundClient;
        }
      }
      if (!docWithClientData.supplierData && docWithClientData.supplier) {
        // Try to find supplier by matching company or name
        const foundSupplier = suppliers.find(s =>
          s.company === docWithClientData.supplier ||
          s.name === docWithClientData.supplier
        );
        if (foundSupplier) {
          docWithClientData.supplierData = foundSupplier;
        }
      }

      // Prepare document data with items if available
      const docWithItems = {
        ...docWithClientData,
        items: docWithClientData.items || (typeof docWithClientData.items === 'number' ? docWithClientData.items : 0),
      };

      switch (docType) {
        case 'invoice':
          await generateInvoicePDF({ ...docWithItems as any, companyInfo });
          break;
        case 'estimate':
          await generateEstimatePDF({ ...docWithItems as any, companyInfo });
          break;
        case 'purchase_order':
          await generatePurchaseOrderPDF({ ...docWithItems as any, companyInfo });
          break;
        case 'delivery_note':
          await generateDeliveryNotePDF({ ...docWithItems as any, companyInfo });
          break;
        case 'statement':
          generateStatementPDF(doc);
          break;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check the console for details.');
    }
  };

  const handlePrintPDF = async (doc: InvoiceDocument & { items?: any }) => {
    try {
      const docType = doc.type || activeTab;

      // If clientData/supplierData is missing, try to find it from CRM using client/supplier name
      let docWithClientData = { ...doc };
      if (!docWithClientData.clientData && docWithClientData.client) {
        const foundClient = clients.find(c =>
          c.company === docWithClientData.client ||
          c.name === docWithClientData.client
        );
        if (foundClient) {
          docWithClientData.clientData = foundClient;
        }
      }
      if (!docWithClientData.supplierData && docWithClientData.supplier) {
        const foundSupplier = suppliers.find(s =>
          s.company === docWithClientData.supplier ||
          s.name === docWithClientData.supplier
        );
        if (foundSupplier) {
          docWithClientData.supplierData = foundSupplier;
        }
      }

      // Prepare document data with items if available
      const docWithItems = {
        ...docWithClientData,
        items: docWithClientData.items || (typeof docWithClientData.items === 'number' ? docWithClientData.items : 0),
      };

      // Generate PDF using the same system as download
      // First, generate the PDF blob
      const { pdf } = await import('@react-pdf/renderer');
      const React = await import('react');
      const { DocumentPDFTemplate } = await import('@/components/documents/DocumentPDFTemplate');
      const items = Array.isArray(docWithItems.items)
        ? docWithItems.items
        : []; // Use actual items from document, no mock items

      // Create PDF document using company info from context
      const pdfDoc = React.createElement(DocumentPDFTemplate, {
        type: docType as any,
        documentId: docWithItems.id,
        date: docWithItems.date,
        client: docWithItems.client,
        supplier: docWithItems.supplier,
        clientData: docWithItems.clientData,
        supplierData: docWithItems.supplierData,
        items: items,
        paymentMethod: docWithItems.paymentMethod as 'cash' | 'check' | 'bank_transfer' | undefined,
        dueDate: docWithItems.dueDate,
        note: docWithItems.note,
        companyInfo: companyInfo as any,
      });

      // Generate PDF blob
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);

      // Open PDF in new window and trigger print dialog
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            // Clean up URL after printing
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }, 500);
        };
      } else {
        // Fallback: download if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = `${docType}_${docWithItems.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
          title: "PDF Ready",
          description: "PDF downloaded. Please open and print manually.",
        });
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast({
        title: "Print Error",
        description: "Error generating PDF for printing. Please try downloading instead.",
        variant: "destructive",
      });
    }
  };

  const handleBulkExportPDF = async () => {
    const documentsToExport = filteredDocuments.filter(doc => selectedDocuments.has(doc.id));
    for (let i = 0; i < documentsToExport.length; i++) {
      await handleDownloadPDF(documentsToExport[i]);
      if (i < documentsToExport.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleDownloadExcel = (doc: InvoiceDocument) => {
    const docType = doc.type || activeTab;
    const itemsCount = Array.isArray(doc.items) ? doc.items.length : (doc.items || 0);
    generateDocumentExcel({ ...doc, items: itemsCount }, docType);
  };

  const handleBulkExportExcel = () => {
    const documentsToExport = filteredDocuments.filter(doc => selectedDocuments.has(doc.id));
    if (documentsToExport.length > 0) {
      const mappedDocs = documentsToExport.map(doc => ({
        ...doc,
        items: Array.isArray(doc.items) ? doc.items.length : (doc.items || 0)
      }));
      generateBulkDocumentsExcel(mappedDocs as any, activeTab);
    }
  };

  const handleDownloadCSV = (doc: InvoiceDocument) => {
    const docType = doc.type || activeTab;
    const itemsCount = Array.isArray(doc.items) ? doc.items.length : (doc.items || 0);
    generateDocumentCSV({ ...doc, items: itemsCount }, docType);
  };

  const handleBulkExportCSV = () => {
    const documentsToExport = filteredDocuments.filter(doc => selectedDocuments.has(doc.id));
    if (documentsToExport.length > 0) {
      const mappedDocs = documentsToExport.map(doc => ({
        ...doc,
        items: Array.isArray(doc.items) ? doc.items.length : (doc.items || 0)
      }));
      generateBulkDocumentsCSV(mappedDocs as any, activeTab);
    }
  };

  const handleViewDocument = (doc: InvoiceDocument) => {
    setViewingDocument(doc);
  };

  const handleEditDocument = (doc: InvoiceDocument) => {
    setEditingDocument(doc);
    setEditFormData({
      client: doc.client,
      supplier: doc.supplier,
      date: doc.date,
      status: doc.status,
      paymentMethod: doc.paymentMethod,
    });
  };

  const handleSaveDocument = async () => {
    if (!editingDocument) return;

    try {
      const updateData = {
        date: editFormData.date,
        status: editFormData.status,
        paymentMethod: editFormData.paymentMethod,
        note: editFormData.note,
        dueDate: editFormData.dueDate,
      };

      switch (activeTab) {
        case 'invoice':
          await updateInvoice(editingDocument.id, updateData);
          break;
        case 'estimate':
          await updateEstimate(editingDocument.id, updateData);
          break;
        case 'purchase_order':
          await updatePurchaseOrder(editingDocument.id, updateData);
          break;
        case 'delivery_note':
          const isDivers = divers.some(d => d.id === editingDocument.id);
          if (isDivers) {
            await updateDivers(editingDocument.id, updateData);
          } else {
            await updateDeliveryNote(editingDocument.id, updateData);
          }
          break;
        case 'statement':
          toast({
            title: "Not Supported",
            description: "Statement updates are not yet implemented.",
            variant: "default",
          });
          return;
      }

      setEditingDocument(null);
      setEditFormData({});
      toast({
        title: "Document Updated",
        description: "Document has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.total = updated.quantity * updated.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  const handleProductSelect = (itemId: string, product: Product | null) => {
    if (product) {
      setItems(items.map(item => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            productId: product.id,
            description: product.name,
            unitPrice: product.price,
          };
          updated.total = updated.quantity * updated.unitPrice;
          return updated;
        }
        return item;
      }));
    } else {
      setItems(items.map(item => {
        if (item.id === itemId) {
          return { ...item, productId: undefined };
        }
        return item;
      }));
    }
  };

  const totals = calculateInvoiceTotals(items);

  const handleCreateDocument = async () => {
    if (items.length === 0 || items.every(item => !item.description || item.quantity === 0 || item.unitPrice === 0)) {
      toast({
        title: "Validation Error",
        description: 'Please add at least one valid line item before creating the document.',
        variant: "destructive",
      });
      return;
    }

    const isPurchase = documentType === 'purchase_order';
    const entityId = isPurchase ? formSupplier : formClient;

    if (!entityId) {
      toast({
        title: "Validation Error",
        description: `Please select a ${isPurchase ? 'supplier' : 'client'}.`,
        variant: "destructive",
      });
      return;
    }

    // Get full client/supplier data from CRM
    const contactData = isPurchase
      ? getSupplierById(entityId)
      : getClientById(entityId);

    // Generate unique document number using database function
    // This ensures uniqueness by checking the database directly
    let documentNumber: string;
    try {
      const { generateDocumentNumberFromDB } = await import('@/lib/document-number-service');
      documentNumber = await generateDocumentNumberFromDB(
        documentType === 'invoice' ? 'invoice' :
          documentType === 'estimate' ? 'estimate' :
            documentType === 'purchase_order' ? 'purchase_order' :
              documentType === 'delivery_note' ? 'delivery_note' :
                'statement',
        formDate
      );
    } catch (error) {
      console.warn('Failed to generate document number from database, using fallback:', error);
      // Fallback to client-side generation if database function fails
      const allExistingDocuments = [
        ...mockFactures,
        ...mockEstimates,
        ...mockPurchaseOrders,
        ...mockDeliveryNotes,
        ...mockStatements,
      ];
      documentNumber = generateDocumentNumber(
        documentType === 'invoice' ? 'invoice' :
          documentType === 'estimate' ? 'estimate' :
            documentType === 'purchase_order' ? 'purchase_order' :
              documentType === 'delivery_note' ? 'delivery_note' :
                'statement',
        allExistingDocuments,
        formDate
      );
    }

    try {
      const documentData = {
        documentId: documentNumber,
        client: isPurchase ? undefined : entityId,
        supplier: isPurchase ? entityId : undefined,
        date: formDate,
        items: items,
        total: documentType === 'invoice' || documentType === 'estimate' ? totals.total : totals.subtotal,
        subtotal: totals.subtotal,
        status: 'draft',
        paymentMethod: documentType === 'invoice' ? formPaymentMethod : undefined,
        note: formNote || undefined,
        dueDate: formDueDate || undefined,
      };

      switch (activeTab) {
        case 'invoice':
          await createInvoice(documentData);
          break;
        case 'estimate':
          await createEstimate(documentData);
          break;
        case 'purchase_order':
          await createPurchaseOrder(documentData);
          break;
        case 'delivery_note':
          await createDeliveryNote(documentData);
          break;
        case 'statement':
          toast({
            title: "Not Supported",
            description: "Statement creation is not yet implemented.",
            variant: "default",
          });
          return;
      }

      // Reset form
      setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }]);
      setFormClient('');
      setFormSupplier('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormPaymentMethod('cash');
      setFormNote('');
      setFormDueDate('');

      toast({
        title: "Document Created",
        description: "Document has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating document:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Check if it's a stock validation error
      if (errorMessage.includes('Insufficient stock')) {
        toast({
          title: "Stock Validation Error",
          description: errorMessage,
          variant: "destructive",
          duration: Infinity, // Persistent
          action: <ToastAction altText="OK">OK</ToastAction>,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to create document: ${errorMessage}`,
          variant: "destructive",
        });
      }
    }

    toast({
      title: t('documents.documentCreated', { defaultValue: 'Document Created' }),
      description: t('documents.documentCreatedDescription', {
        documentType: getDocumentTitle(),
        documentId: documentNumber,
        defaultValue: `${getDocumentTitle()} "${documentNumber}" has been created successfully.`
      }),
    });
  };

  const handlePreviewPDF = async () => {
    const isPurchase = documentType === 'purchase_order';
    const entityId = isPurchase ? formSupplier : formClient;

    if (!entityId) {
      alert(`Please select a ${isPurchase ? 'supplier' : 'client'}.`);
      return;
    }

    // Get full client/supplier data from CRM
    const contactData = isPurchase
      ? getSupplierById(entityId)
      : getClientById(entityId);

    const previewDocument: InvoiceDocument & { items?: any } = {
      id: 'PREVIEW',
      [isPurchase ? 'supplier' : 'client']: contactData?.company || contactData?.name || entityId,
      [isPurchase ? 'supplierData' : 'clientData']: contactData,
      date: formDate,
      items: items as any, // Pass actual items array for preview
      total: documentType === 'invoice' || documentType === 'estimate' ? totals.total : totals.subtotal,
      status: 'draft',
      type: documentType,
      paymentMethod: documentType === 'invoice' ? formPaymentMethod : undefined,
      note: formNote || undefined,
      dueDate: formDueDate || undefined,
    };

    // For preview, pass the actual items array
    await handleDownloadPDF({ ...previewDocument, items: items as any });
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case 'invoice': return t('documents.invoice');
      case 'estimate': return t('documents.estimate');
      case 'purchase_order': return t('documents.purchaseOrder');
      case 'delivery_note': return t('documents.deliveryNote');
      case 'statement': return t('documents.statement');
    }
  };

  const getDocumentIcon = () => {
    switch (documentType) {
      case 'invoice': return <Receipt className="w-5 h-5 text-primary" />;
      case 'estimate': return <FileText className="w-5 h-5 text-primary" />;
      case 'purchase_order': return <ShoppingCart className="w-5 h-5 text-primary" />;
      case 'delivery_note': return <Package className="w-5 h-5 text-primary" />;
      case 'statement': return <FileCheck className="w-5 h-5 text-primary" />;
    }
  };

  const formatPaymentMethod = (method?: string) => {
    if (!method) return '-';
    switch (method) {
      case 'cash': return t('paymentMethods.cash');
      case 'check': return t('paymentMethods.check');
      case 'bank_transfer': return t('paymentMethods.bankTransfer');
      default: return method;
    }
  };

  const getStatusBadge = (status: string) => {
    const formatStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');

    switch (status) {
      case 'paid':
        return <StatusBadge status="success">{t('status.paid')}</StatusBadge>;
      case 'delivered':
        return <StatusBadge status="success">{t('status.delivered')}</StatusBadge>;
      case 'approved':
        return <StatusBadge status="success">{t('status.approved')}</StatusBadge>;
      case 'received':
        return <StatusBadge status="success">{t('status.received')}</StatusBadge>;
      case 'current':
        return <StatusBadge status="success">{t('status.current')}</StatusBadge>;
      case 'accepted':
        return <StatusBadge status="success">{t('status.accepted')}</StatusBadge>;

      case 'pending':
        return <StatusBadge status="warning">{t('status.pending')}</StatusBadge>;
      case 'draft':
        return <StatusBadge status="warning">{t('status.draft')}</StatusBadge>;

      case 'in_transit':
        return <StatusBadge status="info">{t('status.inTransit')}</StatusBadge>;
      case 'sent':
        return <StatusBadge status="info">{t('status.sent')}</StatusBadge>;
      case 'shipped':
        return <StatusBadge status="info">{t('status.shipped')}</StatusBadge>;

      case 'overdue':
        return <StatusBadge status="danger">{t('status.overdue')}</StatusBadge>;
      case 'cancelled':
        return <StatusBadge status="danger">{t('status.cancelled')}</StatusBadge>;
      case 'expired':
        return <StatusBadge status="danger">{t('status.expired')}</StatusBadge>;

      default:
        return <StatusBadge status="default">{formatStatus(status)}</StatusBadge>;
    }
  };

  const getAvailableStatuses = (docType: string): string[] => {
    switch (docType) {
      case 'invoice':
        return ['draft', 'pending', 'paid', 'overdue', 'cancelled'];
      case 'estimate':
        return ['draft', 'sent', 'accepted', 'expired', 'cancelled'];
      case 'purchase_order':
        return ['pending', 'shipped', 'received', 'cancelled'];
      case 'delivery_note':
        return ['pending', 'in_transit', 'delivered', 'cancelled'];
      case 'statement':
        return ['draft', 'current', 'overdue', 'paid'];
      default:
        return [];
    }
  };

  const handleStatusChange = async (docId: string, newStatus: string, docType: string) => {
    try {
      switch (docType) {
        case 'invoice':
          await updateInvoice(docId, { status: newStatus });
          break;
        case 'estimate':
          await updateEstimate(docId, { status: newStatus });
          break;
        case 'purchase_order':
          await updatePurchaseOrder(docId, { status: newStatus });
          break;
        case 'delivery_note':
          const isDivers = divers.some(d => d.id === docId);
          if (isDivers) {
            await updateDivers(docId, { status: newStatus });
          } else {
            await updateDeliveryNote(docId, { status: newStatus });
          }
          break;
        case 'statement':
          toast({
            title: "Not Supported",
            description: "Statement status updates are not yet implemented.",
            variant: "default",
          });
          return;
      }

      toast({
        title: "Status Updated",
        description: "Document status has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const renderStatusSelect = (doc: InvoiceDocument) => {
    const availableStatuses = getAvailableStatuses(doc.type);
    return (
      <div className="flex items-center justify-center">
        <Select
          value={doc.status}
          onValueChange={(newStatus) => handleStatusChange(doc.id, newStatus, doc.type)}
        >
          <SelectTrigger className="w-[140px] h-auto py-1 px-2 text-xs border-transparent bg-transparent hover:bg-transparent shadow-none p-0 [&>span]:w-full">
            <div className="w-full flex items-center justify-center">
              {getStatusBadge(doc.status)}
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableStatuses.map((status) => {
              const isSelected = doc.status === status;
              return (
                <SelectItem
                  key={status}
                  value={status}
                  className="cursor-pointer py-2.5 pl-3 pr-8 hover:bg-muted/50 [&>span:first-child]:hidden"
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center flex-1">
                      {getStatusBadge(status)}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const getAllDocuments = () => {
    switch (activeTab) {
      case 'invoice': return mockFactures;
      case 'estimate': return mockEstimates;
      case 'purchase_order': return mockPurchaseOrders;
      case 'delivery_note': return mockDeliveryNotes;
      case 'statement': return mockStatements;
    }
  };

  const filteredDocuments = getAllDocuments().filter(doc => {
    const matchesSearch = (doc.client || doc.supplier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as typeof activeTab);
    setDocumentType(value as typeof documentType);
  };

  const totalRevenue = [...mockFactures, ...mockDeliveryNotes].reduce((sum, o) => sum + o.total, 0);
  const pendingRevenue = mockFactures
    .filter(o => o.status !== 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  // Invoice Statistics Calculations (for Sales Invoices)
  const invoiceStats = {
    totalInvoices: mockFactures.length,
    paidInvoices: mockFactures.filter(inv => inv.status === 'paid').length,
    unpaidInvoices: mockFactures.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length,
    overdueInvoices: mockFactures.filter(inv => inv.status === 'overdue').length,
    draftInvoices: mockFactures.filter(inv => inv.status === 'draft').length,
    cancelledInvoices: mockFactures.filter(inv => inv.status === 'cancelled').length,
    totalAmount: mockFactures.reduce((sum, inv) => sum + inv.total, 0),
    paidAmount: mockFactures.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    unpaidAmount: mockFactures.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.total, 0),
    overdueAmount: mockFactures.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0),
    paymentMethodBreakdown: {
      cash: mockFactures.filter(inv => inv.paymentMethod === 'cash').reduce((sum, inv) => sum + inv.total, 0),
      check: mockFactures.filter(inv => inv.paymentMethod === 'check').reduce((sum, inv) => sum + inv.total, 0),
      bank_transfer: mockFactures.filter(inv => inv.paymentMethod === 'bank_transfer').reduce((sum, inv) => sum + inv.total, 0),
    },
    clientBreakdown: mockFactures.reduce((acc, inv) => {
      const client = inv.client || '';
      if (!client || !acc[client]) {
        acc[client] = { total: 0, paid: 0, unpaid: 0, count: 0, paidCount: 0, unpaidCount: 0 };
      }
      acc[client].total += inv.total;
      acc[client].count += 1;
      if (inv.status === 'paid') {
        acc[client].paid += inv.total;
        acc[client].paidCount += 1;
      } else if (inv.status !== 'cancelled') {
        acc[client].unpaid += inv.total;
        acc[client].unpaidCount += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; paid: number; unpaid: number; count: number; paidCount: number; unpaidCount: number }>),
  };

  const renderCreateForm = () => {
    const isPurchase = documentType === 'purchase_order';
    const entityLabel = isPurchase ? t('documents.supplier') : t('documents.client');
    const entityPlaceholder = isPurchase ? t('documents.chooseSupplier', { defaultValue: 'Choose a supplier' }) : t('documents.chooseClient');

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-elevated p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">{t('documents.clientInformation', { defaultValue: `${entityLabel} Information` })}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('documents.selectClient', { defaultValue: `Select ${entityLabel}` })}</Label>
                <Select
                  value={isPurchase ? formSupplier : formClient}
                  onValueChange={isPurchase ? setFormSupplier : setFormClient}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={entityPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {(isPurchase ? suppliers : clients)
                      .filter(contact => contact.status === 'active')
                      .map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.company || contact.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('documents.documentDate', { defaultValue: 'Document Date' })}</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('documents.documentNumber')}</Label>
                <Input placeholder={t('common.autoGenerated')} disabled />
              </div>
              {(documentType === 'invoice' || documentType === 'statement') && (
                <div className="space-y-2">
                  <Label>{t('documents.dueDate')}</Label>
                  <Input type="date" />
                </div>
              )}
              {documentType === 'invoice' && (
                <div className="space-y-2">
                  <Label>{t('documents.paymentMethod')}</Label>
                  <Select value={formPaymentMethod} onValueChange={(value) => setFormPaymentMethod(value as 'cash' | 'check' | 'bank_transfer')}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('documents.selectPaymentMethod')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t('paymentMethods.cash')}</SelectItem>
                      <SelectItem value="check">{t('paymentMethods.check')}</SelectItem>
                      <SelectItem value="bank_transfer">{t('paymentMethods.bankTransfer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-foreground">{t('documents.lineItems')}</h3>
              <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
                <Plus className="w-4 h-4" />
                {t('documents.addItem')}
              </Button>
            </div>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border border-border rounded-lg space-y-4 bg-card">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-5">
                      <Label className="text-xs font-medium mb-1.5 block">Product (Optional)</Label>
                      <ProductSearch
                        products={products}
                        value={item.productId}
                        onSelect={(product) => handleProductSelect(item.id, product)}
                        placeholder="Search product..."
                      />
                    </div>
                    <div className="col-span-7">
                      <Label className="text-xs font-medium mb-1.5 block">Description</Label>
                      <Input
                        placeholder="Product or service description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-2">
                      <Label className="text-xs font-medium mb-1.5 block">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs font-medium mb-1.5 block">Unit Price (MAD)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs font-medium mb-1.5 block">Total (MAD)</Label>
                      <Input value={formatMAD(item.total)} disabled className="w-full font-medium" />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note Section */}
          <div className="card-elevated p-6">
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Textarea
                placeholder="Add any additional notes or comments..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          <div className="card-elevated p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">{getDocumentTitle()} Summary</h3>
            </div>
            <div className="space-y-3 overflow-visible">
              <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                <span className="text-muted-foreground flex-shrink-0">Subtotal (HT)</span>
                <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                  <CurrencyDisplay amount={totals.subtotal} />
                </span>
              </div>
              {(documentType === 'invoice' || documentType === 'estimate') && (
                <>
                  <div className="flex justify-between py-2 border-b border-border gap-4 overflow-visible">
                    <span className="text-muted-foreground flex-shrink-0">TVA ({VAT_RATE * 100}%)</span>
                    <span className="font-medium break-words overflow-visible whitespace-normal text-right min-w-0">
                      <CurrencyDisplay amount={totals.vat} />
                    </span>
                  </div>
                  <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                    <span className="font-semibold text-foreground flex-shrink-0">Total (TTC)</span>
                    <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                      <CurrencyDisplay amount={totals.total} />
                    </span>
                  </div>
                </>
              )}
              {(documentType === 'purchase_order' || documentType === 'delivery_note' || documentType === 'statement') && (
                <div className="flex justify-between py-3 text-lg gap-4 overflow-visible">
                  <span className="font-semibold text-foreground flex-shrink-0">Total</span>
                  <span className="font-heading font-bold text-primary break-words overflow-visible whitespace-normal text-right min-w-0">
                    <CurrencyDisplay amount={totals.subtotal} />
                  </span>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-2">
              <Button className="w-full gap-2 btn-primary-gradient" onClick={handleCreateDocument}>
                <Send className="w-4 h-4" />
                Create & Send
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={handlePreviewPDF}>
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListTable = () => {
    const isPurchase = activeTab === 'purchase_order';
    const entityColumnLabel = isPurchase ? 'Supplier' : 'Client';
    const allStatuses = [...new Set(getAllDocuments().map(doc => doc.status))];
    const allSelected = filteredDocuments.length > 0 && selectedDocuments.size === filteredDocuments.length;
    const someSelected = selectedDocuments.size > 0 && selectedDocuments.size < filteredDocuments.length;

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('documents.searchByClientOrDocument', { entity: entityColumnLabel, defaultValue: `Search by ${entityColumnLabel.toLowerCase()} or document number...` })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('documents.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('documents.allStatuses')}</SelectItem>
                {allStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`status.${status}`, { defaultValue: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedDocuments.size > 0 && (
          <div className="card-elevated p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {t('documents.documentsSelected', { count: selectedDocuments.size })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-2">
                <Trash2 className="w-4 h-4" />
                {t('documents.deleteSelected')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    {t('documents.exportSelected')}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleBulkExportPDF} disabled={selectedDocuments.size === 0}>
                    <FileText className="w-4 h-4 mr-2" />
                    {t('documents.exportAsPDF')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkExportExcel} disabled={selectedDocuments.size === 0}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    {t('documents.exportAsExcel')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkExportCSV} disabled={selectedDocuments.size === 0}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    {t('documents.exportAsCSV')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="data-table-header hover:bg-section">
                <TableHead className="w-[70px] min-w-[70px] px-3 text-center">
                  <div className="flex items-center justify-center w-full">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label={t('documents.selectAll')}
                    />
                  </div>
                </TableHead>
                <TableHead>{t('documents.documentNumber')}</TableHead>
                <TableHead>{entityColumnLabel}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead className="text-right">{t('documents.items')}</TableHead>
                <TableHead className="text-right">{t('documents.amountMAD')}</TableHead>
                {activeTab === 'invoice' && <TableHead className="text-center">{t('documents.paymentMethod')}</TableHead>}
                <TableHead className="text-center">{t('common.status')}</TableHead>
                <TableHead className="text-center">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={activeTab === 'invoice' ? 9 : 8} className="text-center py-8 text-muted-foreground" align="center">
                    {t('documents.noDocumentsFound')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className={cn(
                      "hover:bg-section/50",
                      selectedDocuments.has(doc.id) && "bg-primary/5"
                    )}
                  >
                    <TableCell className="w-[70px] min-w-[70px] px-3 text-center">
                      <div className="flex items-center justify-center w-full">
                        <Checkbox
                          checked={selectedDocuments.has(doc.id)}
                          onCheckedChange={() => toggleDocumentSelection(doc.id)}
                          aria-label={t('documents.selectAll')}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-medium max-w-[120px] truncate">{doc.id}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{doc.client || doc.supplier}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{doc.date}</TableCell>
                    <TableCell className="text-right number-cell">
                      {Array.isArray(doc.items) ? doc.items.length : doc.items}
                    </TableCell>
                    <TableCell className="text-right font-medium number-cell">
                      <CurrencyDisplay amount={doc.total} />
                    </TableCell>
                    {activeTab === 'invoice' && (
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">{formatPaymentMethod(doc.paymentMethod)}</span>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {renderStatusSelect(doc)}
                    </TableCell>
                    <TableCell className="w-[180px]">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDocument(doc)}
                          title={t('common.view')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditDocument(doc)}
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownloadPDF(doc)}
                          title={t('documents.downloadPDF')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePrintPDF(doc)}
                          title={t('common.print', { defaultValue: 'Print' })}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc)}
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* View Document Dialog */}
        <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {viewingDocument && (
              <>
                <DialogHeader>
                  <DialogTitle>{t('documents.documentDetails', { documentType: getDocumentTitle() })}</DialogTitle>
                  <DialogDescription>
                    {t('documents.documentNumber')} #{viewingDocument.id}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">{entityColumnLabel}</Label>
                      <p className="font-medium">{viewingDocument.client || viewingDocument.supplier}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('common.date')}</Label>
                      <p className="font-medium">{viewingDocument.date}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('documents.items')}</Label>
                      <p className="font-medium">
                        {Array.isArray(viewingDocument.items) ? viewingDocument.items.length : (viewingDocument.items ? 1 : 0)} {t('documents.itemS')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('common.status')}</Label>
                      <div className="mt-1">{getStatusBadge(viewingDocument.status)}</div>
                    </div>
                    {viewingDocument.type === 'invoice' && (
                      <div>
                        <Label className="text-muted-foreground">{t('documents.paymentMethod')}</Label>
                        <p className="font-medium">{formatPaymentMethod(viewingDocument.paymentMethod)}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">{t('common.total')}</Label>
                      <p className="text-2xl font-bold text-primary">{formatMAD(viewingDocument.total)}</p>
                    </div>
                  </div>
                  {/* Items List */}
                  {Array.isArray(viewingDocument.items) && viewingDocument.items.length > 0 && (
                    <div className="mt-6">
                      <Label className="text-muted-foreground mb-3 block">{t('documents.itemDetails')}</Label>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('common.description')}</TableHead>
                              <TableHead className="text-right">{t('common.quantity')}</TableHead>
                              <TableHead className="text-right">{t('documents.unitPrice', { defaultValue: 'Unit Price' })}</TableHead>
                              <TableHead className="text-right">{t('common.total')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewingDocument.items.map((item: any, index: number) => (
                              <TableRow key={item.id || index}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatMAD(item.unitPrice)}</TableCell>
                                <TableCell className="text-right font-medium">{formatMAD(item.total || item.quantity * item.unitPrice)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewingDocument(null)}>{t('common.close')}</Button>
                  <Button onClick={() => {
                    setViewingDocument(null);
                    handleEditDocument(viewingDocument);
                  }}>{t('common.edit')}</Button>
                  <Button variant="outline" className="gap-2" onClick={() => handleDownloadPDF(viewingDocument)}>
                    <Download className="w-4 h-4" />
                    {t('documents.downloadPDF')}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => handlePrintPDF(viewingDocument)}>
                    <Printer className="w-4 h-4" />
                    {t('common.print', { defaultValue: 'Print' })}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Document Dialog */}
        <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {editingDocument && (
              <>
                <DialogHeader>
                  <DialogTitle>{t('documents.editDocument', { documentType: getDocumentTitle() })}</DialogTitle>
                  <DialogDescription>
                    {t('documents.documentNumber')} #{editingDocument.id}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{entityColumnLabel}</Label>
                      <Input
                        value={editFormData.client || editFormData.supplier || ''}
                        onChange={(e) => {
                          if (activeTab === 'purchase_order') {
                            setEditFormData({ ...editFormData, supplier: e.target.value });
                          } else {
                            setEditFormData({ ...editFormData, client: e.target.value });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('common.date')}</Label>
                      <Input
                        type="date"
                        value={editFormData.date || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('common.status')}</Label>
                      <Select
                        value={editFormData.status || editingDocument.status}
                        onValueChange={(value) => setEditFormData({ ...editFormData, status: value as InvoiceDocument['status'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('status.pending')}</SelectItem>
                          <SelectItem value="paid">{t('status.paid')}</SelectItem>
                          <SelectItem value="sent">{t('status.sent')}</SelectItem>
                          <SelectItem value="delivered">{t('status.delivered')}</SelectItem>
                          <SelectItem value="overdue">{t('status.overdue')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editingDocument.type === 'invoice' && (
                      <div className="space-y-2">
                        <Label>{t('documents.paymentMethod')}</Label>
                        <Select
                          value={editFormData.paymentMethod || editingDocument.paymentMethod || 'cash'}
                          onValueChange={(value) => setEditFormData({ ...editFormData, paymentMethod: value as InvoiceDocument['paymentMethod'] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">{t('paymentMethods.cash')}</SelectItem>
                            <SelectItem value="check">{t('paymentMethods.check')}</SelectItem>
                            <SelectItem value="bank_transfer">{t('paymentMethods.bankTransfer')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setEditingDocument(null);
                    setEditFormData({});
                  }}>{t('common.cancel')}</Button>
                  <Button className="btn-primary-gradient" onClick={handleSaveDocument}>{t('documents.saveChanges')}</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">{t('pages.invoicing', { defaultValue: 'Invoicing' })}</h1>
          <p className="text-muted-foreground">{t('documents.manageInvoicing')}</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {t('common.export')}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const allDocs = getAllDocuments();
                if (allDocs.length > 0) {
                  generateBulkDocumentsExcel(allDocs as any, activeTab);
                }
              }}>
                <FileText className="w-4 h-4 mr-2" />
                {t('documents.exportAllAsExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const allDocs = getAllDocuments();
                if (allDocs.length > 0) {
                  generateBulkDocumentsCSV(allDocs as any, activeTab);
                }
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('documents.exportAllAsCSV')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">{formatMAD(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">{t('documents.totalRevenue')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <FileText className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">{mockFactures.length}</p>
              <p className="text-sm text-muted-foreground">{t('documents.invoice')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">{formatMAD(pendingRevenue)}</p>
              <p className="text-sm text-muted-foreground">{t('documents.pendingRevenue')}</p>
            </div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Users className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                {new Set([...mockFactures, ...mockDeliveryNotes, ...mockEstimates].map(o => o.client)).size}
              </p>
              <p className="text-sm text-muted-foreground">{t('documents.activeClients')}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-section border border-border rounded-lg grid grid-cols-5 w-full p-1.5 gap-1.5">
          <TabsTrigger
            value="invoice"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Receipt className="w-4 h-4" />
            {t('documents.invoice')}
          </TabsTrigger>
          <TabsTrigger
            value="estimate"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <FileText className="w-4 h-4" />
            {t('documents.estimate')}
          </TabsTrigger>
          <TabsTrigger
            value="purchase_order"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            {t('documents.purchaseOrder')}
          </TabsTrigger>
          <TabsTrigger
            value="delivery_note"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <Package className="w-4 h-4" />
            {t('documents.deliveryNote')}
          </TabsTrigger>
          <TabsTrigger
            value="statement"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            <FileCheck className="w-4 h-4" />
            {t('documents.statement')}
          </TabsTrigger>
        </TabsList>

        {(['invoice', 'estimate', 'purchase_order', 'delivery_note'] as const).map((docType) => (
          <TabsContent key={docType} value={docType} className="space-y-6 animate-fade-in">
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
                <TabsTrigger
                  value="create"
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {t('common.create')}
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                >
                  <FileText className="w-4 h-4" />
                  {t('documents.list')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create">
                {renderCreateForm()}
              </TabsContent>

              <TabsContent value="list">
                {renderListTable()}
              </TabsContent>
            </Tabs>
          </TabsContent>
        ))}

        {/* Statement Tab with Invoice Statistics */}
        <TabsContent value="statement" className="space-y-6">
          <Tabs defaultValue="statistics" className="space-y-6">
            <TabsList className="bg-section border border-border rounded-lg p-1.5 gap-1.5">
              <TabsTrigger
                value="statistics"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                {t('sales.invoiceStatistics')}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <FileText className="w-4 h-4" />
                {t('documents.allStatements')}
              </TabsTrigger>
            </TabsList>

            {/* Invoice Statistics Tab */}
            <TabsContent value="statistics" className="space-y-6 animate-fade-in">
              {/* Statistics KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="kpi-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                        {invoiceStats.totalInvoices}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('sales.totalInvoices')}</p>
                    </div>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <CheckSquare className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                        {invoiceStats.paidInvoices}
                      </p>
                      <p className="text-sm text-muted-foreground">Paid Invoices</p>
                    </div>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <FileX className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                        {invoiceStats.unpaidInvoices}
                      </p>
                      <p className="text-sm text-muted-foreground">Unpaid Invoices</p>
                    </div>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <TrendingUp className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-heading font-bold text-foreground break-words overflow-visible whitespace-normal leading-tight">
                        {invoiceStats.overdueInvoices}
                      </p>
                      <p className="text-sm text-muted-foreground">Overdue Invoices</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-foreground">
                    <CurrencyDisplay amount={invoiceStats.totalAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <CheckSquare className="w-4 h-4 text-success" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-success">
                    <CurrencyDisplay amount={invoiceStats.paidAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Unpaid Amount</p>
                    <FileX className="w-4 h-4 text-warning" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-warning">
                    <CurrencyDisplay amount={invoiceStats.unpaidAmount} />
                  </p>
                </div>
                <div className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Overdue Amount</p>
                    <TrendingUp className="w-4 h-4 text-destructive" />
                  </div>
                  <p className="text-2xl font-heading font-bold text-destructive">
                    <CurrencyDisplay amount={invoiceStats.overdueAmount} />
                  </p>
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="card-elevated p-6">
                <h3 className="font-heading font-semibold text-foreground mb-4">Payment Method Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-section rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Cash</p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {mockFactures.filter(inv => inv.paymentMethod === 'cash').length} invoices
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={invoiceStats.paymentMethodBreakdown.cash} />
                    </p>
                  </div>
                  <div className="p-4 bg-section rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Check</p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {mockFactures.filter(inv => inv.paymentMethod === 'check').length} invoices
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={invoiceStats.paymentMethodBreakdown.check} />
                    </p>
                  </div>
                  <div className="p-4 bg-section rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Bank Transfer</p>
                      <span className="text-xs font-medium text-muted-foreground">
                        {mockFactures.filter(inv => inv.paymentMethod === 'bank_transfer').length} invoices
                      </span>
                    </div>
                    <p className="text-xl font-heading font-bold text-foreground">
                      <CurrencyDisplay amount={invoiceStats.paymentMethodBreakdown.bank_transfer} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Invoice Breakdown Table */}
              <div className="card-elevated overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-heading font-semibold text-foreground">Invoice Breakdown by Status</h3>
                  <p className="text-sm text-muted-foreground mt-1">Detailed view of all invoices with payment status</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header hover:bg-section">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount (MAD)</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockFactures.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      mockFactures.map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-section/50">
                          <TableCell className="font-mono font-medium">{invoice.id}</TableCell>
                          <TableCell>{invoice.client || invoice.supplier}</TableCell>
                          <TableCell>{invoice.date}</TableCell>
                          <TableCell className="text-right font-medium">
                            <CurrencyDisplay amount={invoice.total} />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatPaymentMethod(invoice.paymentMethod)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(invoice.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Client Breakdown */}
              <div className="card-elevated overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-heading font-semibold text-foreground">Invoice Breakdown by Client</h3>
                  <p className="text-sm text-muted-foreground mt-1">Summary of invoices per client with paid/unpaid amounts</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header hover:bg-section">
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Total Invoices</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Unpaid</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Paid Amount</TableHead>
                      <TableHead className="text-right">Unpaid Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(invoiceStats.clientBreakdown).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No client data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(invoiceStats.clientBreakdown)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([client, stats]) => (
                          <TableRow key={client} className="hover:bg-section/50">
                            <TableCell className="font-medium">{client}</TableCell>
                            <TableCell className="text-right">{stats.count}</TableCell>
                            <TableCell className="text-right">
                              <span className="text-success font-medium">{stats.paidCount}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-warning font-medium">{stats.unpaidCount}</span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <CurrencyDisplay amount={stats.total} />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-success">
                                <CurrencyDisplay amount={stats.paid} />
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-warning">
                                <CurrencyDisplay amount={stats.unpaid} />
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-elevated p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4">Status Summary</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-success" />
                        <span className="text-sm text-muted-foreground">Paid</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{invoiceStats.paidInvoices}</span>
                        <span className="text-sm font-medium text-success">
                          <CurrencyDisplay amount={invoiceStats.paidAmount} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileX className="w-4 h-4 text-warning" />
                        <span className="text-sm text-muted-foreground">Unpaid (Pending)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                          {invoiceStats.unpaidInvoices - invoiceStats.overdueInvoices}
                        </span>
                        <span className="text-sm font-medium text-warning">
                          <CurrencyDisplay amount={invoiceStats.unpaidAmount - invoiceStats.overdueAmount} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-muted-foreground">Overdue</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{invoiceStats.overdueInvoices}</span>
                        <span className="text-sm font-medium text-destructive">
                          <CurrencyDisplay amount={invoiceStats.overdueAmount} />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Draft</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{invoiceStats.draftInvoices}</span>
                        <span className="text-sm font-medium text-muted-foreground">-</span>
                      </div>
                    </div>
                    {invoiceStats.cancelledInvoices > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileX className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Cancelled</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">{invoiceStats.cancelledInvoices}</span>
                          <span className="text-sm font-medium text-muted-foreground">-</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="card-elevated p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4">Payment Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Total Invoice Amount</span>
                      <span className="text-lg font-heading font-bold text-foreground">
                        <CurrencyDisplay amount={invoiceStats.totalAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Paid Amount</span>
                      <span className="text-lg font-heading font-bold text-success">
                        <CurrencyDisplay amount={invoiceStats.paidAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Outstanding Amount</span>
                      <span className="text-lg font-heading font-bold text-warning">
                        <CurrencyDisplay amount={invoiceStats.unpaidAmount} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-lg border-t-2 border-border mt-2">
                      <span className="font-semibold text-foreground">Collection Rate</span>
                      <span className="font-heading font-bold text-primary">
                        {invoiceStats.totalAmount > 0
                          ? ((invoiceStats.paidAmount / invoiceStats.totalAmount) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list">
              {renderListTable()}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDocument} onOpenChange={(open) => !open && setDeletingDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {getDocumentTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{getDocumentTitle()} #{deletingDocument?.id}</strong> for <strong>{deletingDocument?.client || deletingDocument?.supplier}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDocument}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
