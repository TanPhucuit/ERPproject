// Entity Types
export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: 'CEO' | 'Sales_Manager' | 'Purchasing_Manager' | 'Warehouse_Manager' | 'Accountant'
  status: 'active' | 'inactive' | 'suspended'
}

export interface Product {
  id: string
  sku: string
  name: string
  category_id: string
  image_url?: string
  list_price: number
  cost_price: number
  profit_margin_percent: number
  reorder_level: number
  status: 'active' | 'discontinued'
}

export interface Customer {
  id: string
  customer_number: string
  name: string
  customer_type: 'B2B' | 'B2C'
  email?: string
  credit_limit: number
  credit_used: number
  status: 'active' | 'inactive' | 'blocked'
}

export interface Lead {
  id: string
  lead_number: string
  company_name: string
  stage: 'new' | 'site_survey' | 'proposition' | 'won' | 'lost'
  estimated_value: number
  probability_percent: number
  owner_id?: string
}

export interface SalesOrder {
  id: string
  sales_order_number: string
  customer_id: string
  order_date: string
  required_delivery_date: string
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered'
  total_amount: number
  total_cost: number
  estimated_profit: number
  profit_margin_percent: number
  lines: SalesOrderLine[]
}

export interface SalesOrderLine {
  id: string
  product_id: string
  quantity_ordered: number
  quantity_delivered: number
  unit_price: number
  cost_price: number
  line_profit: number
}

export interface PurchaseOrder {
  id: string
  purchase_order_number: string
  supplier_id: string
  order_date: string
  status: 'draft' | 'confirmed' | 'received'
  total_amount: number
  lines: PurchaseOrderLine[]
}

export interface PurchaseOrderLine {
  id: string
  product_id: string
  quantity_ordered: number
  quantity_received: number
  unit_price: number
}

export interface StockLevel {
  id: string
  product_id: string
  warehouse_id: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  reorder_status: 'optimal' | 'understocked' | 'overstocked' | 'critical'
}

export interface DailyMetrics {
  metric_date: string
  total_sales_revenue: number
  total_cost: number
  total_profit: number
  profit_margin_percent: number
  orders_created: number
  orders_delivered: number
}

export interface DeliveryOrder {
  id: string
  delivery_order_number: string
  sales_order_id: string
  status: 'draft' | 'picked' | 'shipped' | 'delivered'
  scheduled_delivery_date: string
  actual_delivery_date?: string
}

export interface GoodsReceipt {
  id: string
  goods_receipt_number: string
  purchase_order_id: string
  status: 'draft' | 'received' | 'verified' | 'completed'
  received_date: string
}
