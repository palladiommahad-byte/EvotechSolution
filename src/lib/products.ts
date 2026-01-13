export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastMovement: string;
}

export const mockProducts: Product[] = [
  { id: '1', sku: 'ELC-001', name: 'Industrial Motor A-200', category: 'Electronics', stock: 45, minStock: 20, price: 12500, status: 'in_stock', lastMovement: '2024-01-15' },
  { id: '2', sku: 'MCH-002', name: 'Hydraulic Pump HP-500', category: 'Machinery', stock: 8, minStock: 10, price: 34000, status: 'low_stock', lastMovement: '2024-01-14' },
  { id: '3', sku: 'RAW-003', name: 'Steel Plates 10mm', category: 'Raw Materials', stock: 234, minStock: 100, price: 850, status: 'in_stock', lastMovement: '2024-01-15' },
  { id: '4', sku: 'CMP-004', name: 'Electronic Control Board', category: 'Components', stock: 0, minStock: 25, price: 4500, status: 'out_of_stock', lastMovement: '2024-01-10' },
  { id: '5', sku: 'TLS-005', name: 'Precision Drill Set', category: 'Tools', stock: 67, minStock: 30, price: 2800, status: 'in_stock', lastMovement: '2024-01-15' },
  { id: '6', sku: 'SFT-006', name: 'Safety Helmets Pro', category: 'Safety', stock: 12, minStock: 50, price: 450, status: 'low_stock', lastMovement: '2024-01-13' },
  { id: '7', sku: 'ELC-007', name: 'Power Inverter 5KW', category: 'Electronics', stock: 23, minStock: 15, price: 18500, status: 'in_stock', lastMovement: '2024-01-15' },
  { id: '8', sku: 'MCH-008', name: 'CNC Spindle Motor', category: 'Machinery', stock: 5, minStock: 8, price: 67000, status: 'low_stock', lastMovement: '2024-01-12' },
  { id: '9', sku: 'RAW-009', name: 'Aluminum Sheets 5mm', category: 'Raw Materials', stock: 156, minStock: 80, price: 650, status: 'in_stock', lastMovement: '2024-01-14' },
  { id: '10', sku: 'CMP-010', name: 'Circuit Breaker 32A', category: 'Components', stock: 34, minStock: 20, price: 1250, status: 'in_stock', lastMovement: '2024-01-15' },
  { id: '11', sku: 'TLS-011', name: 'Socket Wrench Set', category: 'Tools', stock: 89, minStock: 40, price: 1200, status: 'in_stock', lastMovement: '2024-01-15' },
  { id: '12', sku: 'SFT-012', name: 'Safety Gloves Industrial', category: 'Safety', stock: 145, minStock: 100, price: 85, status: 'in_stock', lastMovement: '2024-01-15' },
];
