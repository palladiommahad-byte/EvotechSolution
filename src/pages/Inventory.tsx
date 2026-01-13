import { useState, useRef, ChangeEvent } from 'react';
import { Plus, Search, Filter, Download, ArrowUpDown, Package, Eye, Edit, Trash2, FolderPlus, FileText, FileSpreadsheet, ChevronDown, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useWarehouse, type Warehouse } from '@/contexts/WarehouseContext';
import { useProducts, Product } from '@/contexts/ProductsContext';
import { formatMAD } from '@/lib/moroccan-utils';
import { MapPin, Building2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { generateInventoryPDF } from '@/lib/pdf-generator';
import { generateInventoryExcel } from '@/lib/excel-generator';
import { generateInventoryCSV } from '@/lib/csv-generator';
import { useToast } from '@/hooks/use-toast';

const productUnits = ['Piece', 'kg', 'Liter', 'Box', 'Pack', 'Meter', 'Square Meter', 'Cubic Meter', 'Ton', 'Gram'] as const;

export const Inventory = () => {
  const { warehouseInfo, isAllWarehouses, activeWarehouse, setActiveWarehouse, warehouses } = useWarehouse();
  const { toast } = useToast();
  const { products, stockItems, addProduct, updateProduct, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState<'all' | 'new' | 'old'>('all');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState<Partial<Product>>({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'Piece',
    stock: 0,
    minStock: 0,
    price: 0,
    status: 'in_stock',
    lastMovement: new Date().toISOString().split('T')[0],
  });
  const [warehouseStock, setWarehouseStock] = useState<{
    marrakech?: number;
    agadir?: number;
    ouarzazate?: number;
  }>({});

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    
    // Filter by new/old products (based on last movement date - new: last 30 days, old: older than 30 days)
    let matchesAge = true;
    if (ageFilter !== 'all') {
      const lastMovementDate = new Date(product.lastMovement);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (ageFilter === 'new') {
        matchesAge = lastMovementDate >= thirtyDaysAgo;
      } else if (ageFilter === 'old') {
        matchesAge = lastMovementDate < thirtyDaysAgo;
      }
    }
    
    return matchesSearch && matchesCategory && matchesStatus && matchesAge;
  });

  const getStatusBadge = (status: Product['status']) => {
    switch (status) {
      case 'in_stock':
        return <StatusBadge status="success">In Stock</StatusBadge>;
      case 'low_stock':
        return <StatusBadge status="warning">Low Stock</StatusBadge>;
      case 'out_of_stock':
        return <StatusBadge status="danger">Out of Stock</StatusBadge>;
    }
  };

  const productCategories = [...new Set(products.map(p => p.category))];
  const allCategories = [...new Set([...productCategories, ...customCategories])].sort();

  // Get stock for a product based on selected warehouse
  const getProductStock = (productId: string): number => {
    const stockItem = stockItems.find(si => si.id === productId);
    if (!stockItem) {
      // Fallback to product stock if no stock item found
      const product = products.find(p => p.id === productId);
      return product?.stock || 0;
    }

    if (isAllWarehouses) {
      // Return total stock across all warehouses
      return stockItem.stock.marrakech + stockItem.stock.agadir + stockItem.stock.ouarzazate;
    } else {
      // Return stock for specific warehouse
      return stockItem.stock[activeWarehouse as keyof typeof stockItem.stock] || 0;
    }
  };

  const handleCreateCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName && !allCategories.includes(trimmedName)) {
      setCustomCategories([...customCategories, trimmedName]);
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
      // Set the new category as the active filter
      setCategoryFilter(trimmedName);
      toast({
        title: "Category Created",
        description: `Category "${trimmedName}" has been created successfully.`,
      });
    }
  };

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      category: product.category,
      unit: product.unit || 'Piece',
      stock: product.stock,
      minStock: product.minStock,
      price: product.price,
      status: product.status,
      lastMovement: product.lastMovement,
      image: product.image || undefined,
    });
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image file size must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        if (isEdit) {
          setEditFormData({ ...editFormData, image: imageUrl });
        } else {
          setNewProductData({ ...newProductData, image: imageUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditFormData({ ...editFormData, image: undefined });
    } else {
      setNewProductData({ ...newProductData, image: undefined });
    }
  };

  const handleSaveProduct = async () => {
    if (editingProduct) {
      if (!editFormData.name || !editFormData.sku || !editFormData.category) {
        toast({
          title: "Error",
          description: "Please fill in Product Name, SKU, and Category.",
          variant: "destructive",
        });
        return;
      }
      const productName = editFormData.name || editingProduct.name;
      try {
        await updateProduct(editingProduct.id, editFormData);
        setEditingProduct(null);
        setEditFormData({});
        toast({
          title: "Product Updated",
          description: `Product "${productName}" has been updated successfully.`,
        });
      } catch (error) {
        console.error('Error updating product:', error);
        toast({
          title: "Error",
          description: "Failed to update product. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateProduct = () => {
    setIsCreatingProduct(true);
    setNewProductData({
      sku: '',
      name: '',
      description: '',
      category: '',
      unit: 'Piece',
      stock: 0,
      minStock: 0,
      price: 0,
      status: 'in_stock',
      lastMovement: new Date().toISOString().split('T')[0],
      image: undefined,
    });
  };

  const handleSaveNewProduct = async () => {
    if (!newProductData.name || !newProductData.sku || !newProductData.category) {
      toast({
        title: "Error",
        description: "Please fill in Product Name, SKU, and Category.",
        variant: "destructive",
      });
      return;
    }

    // Check if SKU already exists
    if (products.some(p => p.sku === newProductData.sku)) {
      toast({
        title: "Error",
        description: "A product with this SKU already exists. Please use a different SKU.",
        variant: "destructive",
      });
      return;
    }

    // Calculate total stock from warehouse allocations
    const totalStock = (warehouseStock.marrakech || 0) + 
                      (warehouseStock.agadir || 0) + 
                      (warehouseStock.ouarzazate || 0);

    const newProduct: Omit<Product, 'id'> = {
      sku: newProductData.sku || '',
      name: newProductData.name || '',
      description: newProductData.description || '',
      category: newProductData.category || '',
      unit: newProductData.unit || 'Piece',
      stock: totalStock,
      minStock: newProductData.minStock || 0,
      price: newProductData.price || 0,
      status: 'in_stock', // Will be calculated by the service
      lastMovement: newProductData.lastMovement || new Date().toISOString().split('T')[0],
      image: newProductData.image || undefined,
    };

    try {
      await addProduct(newProduct, warehouseStock);
      setIsCreatingProduct(false);
      setNewProductData({
        sku: '',
        name: '',
        description: '',
        category: '',
        unit: 'Piece',
        stock: 0,
        minStock: 0,
        price: 0,
        status: 'in_stock',
        lastMovement: new Date().toISOString().split('T')[0],
        image: undefined,
      });
      setWarehouseStock({});
      toast({
        title: "Product Created",
        description: `Product "${newProduct.name}" has been created successfully and added to Stock Tracking.`,
      });
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProduct(product);
  };

  const confirmDeleteProduct = async () => {
    if (deletingProduct) {
      const productName = deletingProduct.name;
      try {
        await deleteProduct(deletingProduct.id);
        setDeletingProduct(null);
        toast({
          title: "Product Deleted",
          description: `Product "${productName}" has been deleted successfully.`,
          variant: "destructive",
        });
      } catch (error) {
        console.error('Error deleting product:', error);
        toast({
          title: "Error",
          description: "Failed to delete product. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">
            Manage products {isAllWarehouses ? 'across all warehouses' : `at ${warehouseInfo?.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
                <ChevronDown className="w-3 h-3" />
          </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => generateInventoryPDF(products)}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateInventoryExcel(products)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => generateInventoryCSV(products)}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2 btn-primary-gradient" onClick={handleCreateProduct}>
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-elevated p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={activeWarehouse} onValueChange={(value) => setActiveWarehouse(value as Warehouse)}>
              <SelectTrigger className="w-[200px] border-border bg-section hover:bg-section/80">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <SelectValue placeholder="Select warehouse" className="font-medium text-foreground">
                    {isAllWarehouses ? 'All Warehouses' : warehouseInfo?.city}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent className="w-[280px] p-1">
                <div className="px-3 py-2 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  Select Warehouse
                </div>
                
                {/* All Warehouses Option */}
                <SelectItem 
                  value="all"
                  className={cn(
                    "cursor-pointer rounded-md px-3 py-2.5 my-0.5",
                    isAllWarehouses && "bg-primary/5",
                    "[&>span:first-child]:hidden"
                  )}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isAllWarehouses ? "bg-primary/10" : "bg-muted/50"
                    )}>
                      <Building2 className={cn(
                        "w-4 h-4 transition-colors",
                        isAllWarehouses ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={cn(
                          "font-semibold text-sm leading-tight truncate",
                          isAllWarehouses ? "text-primary" : "text-foreground"
                        )}>
                          All Warehouses
                        </span>
                        <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                          View all locations
                        </span>
                      </div>
                      {isAllWarehouses && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </SelectItem>

                {/* Individual Warehouses */}
                {warehouses.map((warehouse) => {
                  const isActive = warehouse.id === activeWarehouse;
                  return (
                    <SelectItem 
                      key={warehouse.id} 
                      value={warehouse.id}
                      className={cn(
                        "cursor-pointer rounded-md px-3 py-2.5 my-0.5",
                        isActive && "bg-primary/5",
                        "[&>span:first-child]:hidden"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          isActive ? "bg-primary/10" : "bg-muted/50"
                        )}>
                          <Building2 className={cn(
                            "w-4 h-4 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className={cn(
                              "font-semibold text-sm leading-tight truncate",
                              isActive ? "text-primary" : "text-foreground"
                            )}>
                              {warehouse.city}
                            </span>
                            <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                              {warehouse.name}
                            </span>
                          </div>
                          {isActive && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ageFilter} onValueChange={(value) => setAgeFilter(value as 'all' | 'new' | 'old')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Product Age" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="new">New (Last 30 days)</SelectItem>
              <SelectItem value="old">Old (30+ days)</SelectItem>
            </SelectContent>
          </Select>
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="w-[42px]" title="Add New Category">
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                  <DialogDescription>
                    Add a new category to organize your products. Category names must be unique.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      placeholder="e.g., Machinery, Electronics..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateCategory();
                        }
                      }}
                      autoFocus
                    />
                    {newCategoryName.trim() && allCategories.includes(newCategoryName.trim()) && (
                      <p className="text-sm text-destructive mt-1">This category already exists</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsCategoryDialogOpen(false);
                    setNewCategoryName('');
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || allCategories.includes(newCategoryName.trim())}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="data-table-header hover:bg-section">
              <TableHead className="w-[100px]">SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Stock</TableHead>
              <TableHead className="text-center">Min Stock</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id} className="hover:bg-section/50">
                <TableCell className="font-mono text-sm max-w-[100px] truncate">{product.sku}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{product.name}</TableCell>
                <TableCell className="text-muted-foreground max-w-[120px] truncate">{product.category}</TableCell>
                <TableCell className="text-center font-medium number-cell">
                  {getProductStock(product.id)} {product.unit || 'Piece'}
                </TableCell>
                <TableCell className="text-center text-muted-foreground number-cell">
                  {product.minStock} {product.unit || 'Piece'}
                </TableCell>
                <TableCell className="text-right font-medium number-cell">
                  <CurrencyDisplay amount={product.price} />
                </TableCell>
                <TableCell className="text-center">{getStatusBadge(product.status)}</TableCell>
                <TableCell className="w-[120px]">
                  <div className="flex items-center justify-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleViewProduct(product)}
                      title="View product details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleEditProduct(product)}
                      title="Edit product"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteProduct(product)}
                      title="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <Package className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {products.filter(p => {
                const stock = getProductStock(p.id);
                return stock > 0 && stock >= p.minStock;
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">
              In Stock {!isAllWarehouses ? `(${warehouseInfo?.city})` : '(All)'}
            </p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Package className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {products.filter(p => {
                const stock = getProductStock(p.id);
                return stock > 0 && stock < p.minStock;
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">
              Low Stock {!isAllWarehouses ? `(${warehouseInfo?.city})` : '(All)'}
            </p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Package className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {products.filter(p => getProductStock(p.id) === 0).length}
            </p>
            <p className="text-sm text-muted-foreground">
              Out of Stock {!isAllWarehouses ? `(${warehouseInfo?.city})` : '(All)'}
            </p>
          </div>
        </div>
      </div>

      {/* View Product Dialog */}
      <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingProduct && (
            <>
              <DialogHeader>
                <DialogTitle>Product Details</DialogTitle>
                <DialogDescription>
                  Complete information for {viewingProduct.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Product Image */}
                {viewingProduct.image && (
                  <div className="flex justify-center">
                    <img 
                      src={viewingProduct.image} 
                      alt={viewingProduct.name} 
                      className="max-h-64 max-w-full rounded-lg object-contain border border-border"
                    />
                  </div>
                )}
                {/* Product Header */}
                <div className="flex items-start gap-4 pb-4 border-b border-border">
                  <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-heading font-bold text-foreground mb-1">
                      {viewingProduct.name}
                    </h3>
                    <p className="text-sm font-mono text-muted-foreground">
                      SKU: {viewingProduct.sku}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(viewingProduct.status)}
                  </div>
                </div>

                {/* Product Information Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Product ID</Label>
                    <p className="font-medium font-mono text-sm mt-1">{viewingProduct.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">SKU</Label>
                    <p className="font-medium font-mono text-sm mt-1">{viewingProduct.sku}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Category</Label>
                    <p className="font-medium mt-1">{viewingProduct.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Unit</Label>
                    <p className="font-medium mt-1">{viewingProduct.unit || 'Piece'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Status</Label>
                    <div className="mt-1">{getStatusBadge(viewingProduct.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Unit Price</Label>
                    <p className="font-medium mt-1">
                      <CurrencyDisplay amount={viewingProduct.price} />
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Last Movement</Label>
                    <p className="font-medium mt-1">{viewingProduct.lastMovement}</p>
                  </div>
                </div>

                {/* Product Description */}
                {viewingProduct.description && (
                  <div className="border-t border-border pt-4">
                    <Label className="text-muted-foreground text-sm">Description</Label>
                    <p className="font-medium mt-2 text-foreground whitespace-pre-wrap">
                      {viewingProduct.description}
                    </p>
                  </div>
                )}

                {/* Stock Information */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold text-foreground mb-3">Stock Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card-elevated p-4">
                      <Label className="text-muted-foreground text-sm">
                        Current Stock {isAllWarehouses ? '(Total)' : `(${warehouseInfo?.city})`}
                      </Label>
                      <p className="text-2xl font-heading font-bold text-foreground mt-1">
                        {getProductStock(viewingProduct.id)} {viewingProduct.unit || 'Piece'}
                      </p>
                    </div>
                    <div className="card-elevated p-4">
                      <Label className="text-muted-foreground text-sm">Minimum Stock</Label>
                      <p className="text-2xl font-heading font-bold text-warning mt-1">
                        {viewingProduct.minStock} {viewingProduct.unit || 'Piece'}
                      </p>
                    </div>
                    {!isAllWarehouses && (
                      <div className="col-span-2 space-y-2 mt-2">
                        <Label className="text-muted-foreground text-sm">Stock by Warehouse</Label>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          {warehouses.map((wh) => {
                            const stockItem = stockItems.find(si => si.id === viewingProduct.id);
                            const whStock = stockItem?.stock[wh.id as keyof typeof stockItem.stock] || 0;
                            return (
                              <div key={wh.id} className="p-2 border border-border rounded">
                                <p className="text-xs text-muted-foreground">{wh.city}</p>
                                <p className="font-medium">{whStock} {viewingProduct.unit || 'Piece'}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {getProductStock(viewingProduct.id) < viewingProduct.minStock && (
                    <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm text-warning font-medium">
                        ⚠️ Stock is below minimum threshold
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current stock: {getProductStock(viewingProduct.id)} / Minimum required: {viewingProduct.minStock}
                      </p>
                    </div>
                  )}
                  {getProductStock(viewingProduct.id) === 0 && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ⚠️ Product is out of stock {!isAllWarehouses ? `at ${warehouseInfo?.city}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                {/* Total Value */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <Label className="text-muted-foreground">
                      Total Inventory Value {!isAllWarehouses ? `(${warehouseInfo?.city})` : ''}
                    </Label>
                    <p className="text-xl font-heading font-bold text-primary">
                      <CurrencyDisplay amount={viewingProduct.price * getProductStock(viewingProduct.id)} />
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingProduct(null)}>
                  Close
                </Button>
                <Button className="btn-primary-gradient" onClick={() => {
                  handleEditProduct(viewingProduct);
                  setViewingProduct(null);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Product
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingProduct && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>
                  Update product information for {editingProduct.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Product Name</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="Product name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input
                      id="edit-sku"
                      value={editFormData.sku || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                      placeholder="SKU code"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category *</Label>
                    <Select
                      value={editFormData.category || ''}
                      onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
                    >
                      <SelectTrigger id="edit-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-unit">Unit</Label>
                    <Select
                      value={editFormData.unit || 'Piece'}
                      onValueChange={(value) => setEditFormData({ ...editFormData, unit: value })}
                    >
                      <SelectTrigger id="edit-unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {productUnits.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      placeholder="Enter product description..."
                      rows={3}
                    />
                  </div>
                  {/* Product Image Upload */}
                  <div className="space-y-2 col-span-2">
                    <Label>Product Image</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      {editFormData.image ? (
                        <div className="space-y-4">
                          <div className="relative inline-block">
                            <img 
                              src={editFormData.image} 
                              alt="Product preview" 
                              className="max-h-48 max-w-full rounded-lg mx-auto object-contain"
                            />
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editImageInputRef.current?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Change Image
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveImage(true)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-16 h-16 rounded-lg bg-primary/10 mx-auto flex items-center justify-center">
                            <Upload className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Upload product image</p>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG up to 5MB</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editImageInputRef.current?.click()}
                          >
                            Choose Image
                          </Button>
                        </div>
                      )}
                      <input
                        ref={editImageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, true)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editFormData.status || 'in_stock'}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value as Product['status'] })}
                    >
                      <SelectTrigger id="edit-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="low_stock">Low Stock</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-stock">Current Stock</Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      min="0"
                      value={editFormData.stock || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, stock: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-min-stock">Minimum Stock</Label>
                    <Input
                      id="edit-min-stock"
                      type="number"
                      min="0"
                      value={editFormData.minStock || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, minStock: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Unit Price (DH)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFormData.price || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-last-movement">Last Movement</Label>
                    <Input
                      id="edit-last-movement"
                      type="date"
                      value={editFormData.lastMovement || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, lastMovement: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditingProduct(null);
                  setEditFormData({});
                }}>
                  Cancel
                </Button>
                <Button 
                  className="btn-primary-gradient" 
                  onClick={handleSaveProduct}
                  disabled={!editFormData.name || !editFormData.sku || !editFormData.category}
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog open={isCreatingProduct} onOpenChange={setIsCreatingProduct}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
            <DialogDescription>
              Add a new product to your inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Product Name *</Label>
                <Input
                  id="new-name"
                  value={newProductData.name || ''}
                  onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-sku">SKU *</Label>
                <Input
                  id="new-sku"
                  value={newProductData.sku || ''}
                  onChange={(e) => setNewProductData({ ...newProductData, sku: e.target.value })}
                  placeholder="SKU code"
                  className="font-mono"
                />
                {newProductData.sku && products.some(p => p.sku === newProductData.sku) && (
                  <p className="text-sm text-destructive mt-1">This SKU already exists</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-category">Category *</Label>
                <Select
                  value={newProductData.category || ''}
                  onValueChange={(value) => setNewProductData({ ...newProductData, category: value })}
                >
                  <SelectTrigger id="new-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-unit">Unit</Label>
                <Select
                  value={newProductData.unit || 'Piece'}
                  onValueChange={(value) => setNewProductData({ ...newProductData, unit: value })}
                >
                  <SelectTrigger id="new-unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {productUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="new-description">Description</Label>
                <Textarea
                  id="new-description"
                  value={newProductData.description || ''}
                  onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
                  placeholder="Enter product description..."
                  rows={3}
                />
              </div>
              {/* Product Image Upload */}
              <div className="space-y-2 col-span-2">
                <Label>Product Image</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  {newProductData.image ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img 
                          src={newProductData.image} 
                          alt="Product preview" 
                          className="max-h-48 max-w-full rounded-lg mx-auto object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => productImageInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Change Image
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveImage(false)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 mx-auto flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Upload product image</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG up to 5MB</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => productImageInputRef.current?.click()}
                      >
                        Choose Image
                      </Button>
                    </div>
                  )}
                  <input
                    ref={productImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, false)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-status">Status</Label>
                <Select
                  value={newProductData.status || 'in_stock'}
                  onValueChange={(value) => setNewProductData({ ...newProductData, status: value as Product['status'] })}
                >
                  <SelectTrigger id="new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-min-stock">Minimum Stock</Label>
                <Input
                  id="new-min-stock"
                  type="number"
                  min="0"
                  value={newProductData.minStock || 0}
                  onChange={(e) => setNewProductData({ ...newProductData, minStock: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-price">Unit Price (DH)</Label>
                <Input
                  id="new-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProductData.price || 0}
                  onChange={(e) => setNewProductData({ ...newProductData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-last-movement">Last Movement</Label>
                <Input
                  id="new-last-movement"
                  type="date"
                  value={newProductData.lastMovement || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewProductData({ ...newProductData, lastMovement: e.target.value })}
                />
              </div>
            </div>

            {/* Warehouse Stock Allocation Section */}
            <div className="col-span-2 space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Warehouse Stock Allocation</Label>
                <span className="text-sm text-muted-foreground">
                  Total: {(warehouseStock.marrakech || 0) + (warehouseStock.agadir || 0) + (warehouseStock.ouarzazate || 0)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Marrakech Warehouse */}
                <div className="space-y-2 p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <Label htmlFor="stock-marrakech" className="font-medium">Marrakech</Label>
                  </div>
                  <Input
                    id="stock-marrakech"
                    type="number"
                    min="0"
                    value={warehouseStock.marrakech || ''}
                    onChange={(e) => setWarehouseStock({
                      ...warehouseStock,
                      marrakech: parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                    className="w-full"
                  />
                </div>

                {/* Agadir Warehouse */}
                <div className="space-y-2 p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <Label htmlFor="stock-agadir" className="font-medium">Agadir</Label>
                  </div>
                  <Input
                    id="stock-agadir"
                    type="number"
                    min="0"
                    value={warehouseStock.agadir || ''}
                    onChange={(e) => setWarehouseStock({
                      ...warehouseStock,
                      agadir: parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                    className="w-full"
                  />
                </div>

                {/* Ouarzazate Warehouse */}
                <div className="space-y-2 p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <Label htmlFor="stock-ouarzazate" className="font-medium">Ouarzazate</Label>
                  </div>
                  <Input
                    id="stock-ouarzazate"
                    type="number"
                    min="0"
                    value={warehouseStock.ouarzazate || ''}
                    onChange={(e) => setWarehouseStock({
                      ...warehouseStock,
                      ouarzazate: parseInt(e.target.value) || 0
                    })}
                    placeholder="0"
                    className="w-full"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Allocate stock to specific warehouses. Total stock will be calculated automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreatingProduct(false);
              setNewProductData({
                sku: '',
                name: '',
                description: '',
                category: '',
                unit: 'Piece',
                stock: 0,
                minStock: 0,
                price: 0,
                status: 'in_stock',
                lastMovement: new Date().toISOString().split('T')[0],
                image: undefined,
              });
              setWarehouseStock({});
            }}>
              Cancel
            </Button>
            <Button 
              className="btn-primary-gradient" 
              onClick={handleSaveNewProduct}
              disabled={!newProductData.name || !newProductData.sku || !newProductData.category || products.some(p => p.sku === newProductData.sku)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingProduct?.name}</strong> (SKU: {deletingProduct?.sku})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProduct}
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
