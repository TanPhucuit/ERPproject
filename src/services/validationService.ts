/**
 * Validation Service with Business Rule Constraints
 * Ensures data integrity and prevents incorrect edits per business process
 */

// Business rule constraints for each module
export const ValidationRules = {
  // ACCOUNTING MODULE
  Invoice: {
    // Once an invoice is paid, most fields become read-only
    canEdit: (invoice: any) => {
      return invoice.status !== 'paid' && invoice.status !== 'cancelled'
    },
    editableFields: (invoice: any) => {
      if (invoice.status === 'paid' || invoice.status === 'cancelled') {
        return ['notes', 'internal_comments'] // Only notes can be edited
      }
      if (invoice.status === 'partially_paid') {
        return ['due_date', 'notes', 'internal_comments', 'payment_terms']
      }
      // Draft/pending status - most fields editable
      return [
        'customer_id',
        'invoice_date',
        'due_date',
        'payment_terms',
        'notes',
        'internal_comments',
        'tax_rate',
        'discount_percent',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      // Invoice date cannot be in the future
      if (data.invoice_date && new Date(data.invoice_date) > new Date()) {
        errors.push('Invoice date cannot be in the future')
      }

      // Due date must be after invoice date
      if (
        data.due_date &&
        data.invoice_date &&
        new Date(data.due_date) < new Date(data.invoice_date)
      ) {
        errors.push('Due date must be after invoice date')
      }

      // Tax rate must be between 0-100
      if (data.tax_rate !== undefined && (data.tax_rate < 0 || data.tax_rate > 100)) {
        errors.push('Tax rate must be between 0-100%')
      }

      // Discount cannot exceed 100%
      if (data.discount_percent !== undefined && (data.discount_percent < 0 || data.discount_percent > 100)) {
        errors.push('Discount cannot exceed 100%')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  Bill: {
    canEdit: (bill: any) => {
      return bill.status !== 'paid' && bill.status !== 'cancelled'
    },
    editableFields: (bill: any) => {
      if (bill.status === 'paid' || bill.status === 'cancelled') {
        return ['notes']
      }
      return [
        'supplier_id',
        'bill_date',
        'due_date',
        'payment_terms',
        'notes',
        'reference_po',
        'tax_rate',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (data.bill_date && new Date(data.bill_date) > new Date()) {
        errors.push('Bill date cannot be in the future')
      }

      if (
        data.due_date &&
        data.bill_date &&
        new Date(data.due_date) < new Date(data.bill_date)
      ) {
        errors.push('Due date must be after bill date')
      }

      if (data.tax_rate !== undefined && (data.tax_rate < 0 || data.tax_rate > 100)) {
        errors.push('Tax rate must be between 0-100%')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  // CRM MODULE
  Lead: {
    canEdit: (lead: any) => {
      // Cannot edit lost or won leads (closed deals)
      return lead.status !== 'lost' && lead.status !== 'won'
    },
    editableFields: (lead: any) => {
      if (lead.status === 'lost' || lead.status === 'won') {
        return ['internal_notes', 'follow_up_date'] // Minimal edits for closed leads
      }
      return [
        'first_name',
        'last_name',
        'company',
        'email',
        'phone',
        'job_title',
        'lead_source',
        'estimated_value',
        'next_follow_up',
        'internal_notes',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.first_name || data.first_name.trim() === '') {
        errors.push('First name is required')
      }

      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Valid email address is required')
      }

      if (data.phone && !/^[0-9\s\-\(\)\+]+$/.test(data.phone)) {
        errors.push('Phone number format is invalid')
      }

      if (data.estimated_value !== undefined && data.estimated_value < 0) {
        errors.push('Estimated value cannot be negative')
      }

      if (data.next_follow_up && new Date(data.next_follow_up) < new Date()) {
        errors.push('Follow up date cannot be in the past')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  // SALES MODULE
  SalesOrder: {
    canEdit: (order: any) => {
      // Cannot edit completed, cancelled, or out for delivery orders
      return order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'dispatched'
    },
    editableFields: (order: any) => {
      if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'dispatched') {
        return ['notes', 'internal_comments'] // Only notes for finalized orders
      }
      if (order.status === 'confirmed') {
        return ['delivery_address', 'due_date', 'notes', 'internal_comments', 'payment_terms']
      }
      // draft/pending status - most fields editable
      return [
        'customer_id',
        'order_date',
        'due_date',
        'delivery_address',
        'payment_terms',
        'notes',
        'internal_comments',
        'tax_rate',
        'discount_percent',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.customer_id) {
        errors.push('Customer is required')
      }

      if (data.order_date && new Date(data.order_date) > new Date()) {
        errors.push('Order date cannot be in the future')
      }

      if (
        data.due_date &&
        data.order_date &&
        new Date(data.due_date) < new Date(data.order_date)
      ) {
        errors.push('Due date must be after order date')
      }

      if (data.tax_rate !== undefined && (data.tax_rate < 0 || data.tax_rate > 100)) {
        errors.push('Tax rate must be between 0-100%')
      }

      if (data.discount_percent !== undefined && (data.discount_percent < 0 || data.discount_percent > 100)) {
        errors.push('Discount cannot exceed 100%')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  Quotation: {
    canEdit: (quote: any) => {
      // Cannot edit won, lost, rejected, or expired quotations
      return (
        quote.status !== 'won' &&
        quote.status !== 'lost' &&
        quote.status !== 'rejected' &&
        quote.status !== 'expired'
      )
    },
    editableFields: (quote: any) => {
      if (quote.status === 'won' || quote.status === 'lost' || quote.status === 'rejected' || quote.status === 'expired') {
        return ['notes', 'internal_comments'] // Minimal edits for closed quotes
      }
      if (quote.status === 'sent' || quote.status === 'under_review') {
        return ['expiry_date', 'follow_up_date', 'notes', 'internal_comments']
      }
      // draft status - most fields editable
      return [
        'customer_id',
        'quote_date',
        'expiry_date',
        'description',
        'quoted_amount',
        'notes',
        'internal_comments',
        'tax_rate',
        'discount_percent',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.customer_id) {
        errors.push('Customer is required')
      }

      if (data.quote_date && new Date(data.quote_date) > new Date()) {
        errors.push('Quote date cannot be in the future')
      }

      if (
        data.expiry_date &&
        data.quote_date &&
        new Date(data.expiry_date) < new Date(data.quote_date)
      ) {
        errors.push('Expiry date must be after quote date')
      }

      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        errors.push('Expiry date must be in the future')
      }

      if (data.quoted_amount !== undefined && data.quoted_amount <= 0) {
        errors.push('Quoted amount must be greater than 0')
      }

      if (data.tax_rate !== undefined && (data.tax_rate < 0 || data.tax_rate > 100)) {
        errors.push('Tax rate must be between 0-100%')
      }

      if (data.discount_percent !== undefined && (data.discount_percent < 0 || data.discount_percent > 100)) {
        errors.push('Discount cannot exceed 100%')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  // PURCHASE MODULE
  PurchaseOrder: {
    canEdit: (po: any) => {
      // Can only edit draft and pending orders, not received or cancelled
      return po.status !== 'received' && po.status !== 'cancelled'
    },
    editableFields: (po: any) => {
      if (po.status === 'received' || po.status === 'cancelled') {
        return ['notes', 'internal_comments'] // Only notes for closed POs
      }
      if (po.status === 'confirmed') {
        return ['delivery_address', 'due_date', 'payment_terms', 'notes']
      }
      // draft status
      return [
        'supplier_id',
        'delivery_address',
        'po_date',
        'due_date',
        'payment_terms',
        'notes',
        'tax_rate',
        'shipping_cost',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.supplier_id) {
        errors.push('Supplier is required')
      }

      if (data.po_date && new Date(data.po_date) > new Date()) {
        errors.push('PO date cannot be in the future')
      }

      if (data.due_date && data.po_date && new Date(data.due_date) < new Date(data.po_date)) {
        errors.push('Due date must be after PO date')
      }

      if (data.tax_rate !== undefined && (data.tax_rate < 0 || data.tax_rate > 100)) {
        errors.push('Tax rate must be between 0-100%')
      }

      if (data.shipping_cost !== undefined && data.shipping_cost < 0) {
        errors.push('Shipping cost cannot be negative')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  RFQ: {
    canEdit: (rfq: any) => {
      // Can edit draft and open RFQs, not closed or awarded
      return rfq.status !== 'awarded' && rfq.status !== 'cancelled'
    },
    editableFields: (rfq: any) => {
      if (rfq.status === 'awarded' || rfq.status === 'cancelled') {
        return []
      }
      return [
        'due_date',
        'specification',
        'required_quantity',
        'target_price',
        'notes',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.due_date) {
        errors.push('RFQ due date is required')
      }

      if (data.due_date && new Date(data.due_date) < new Date()) {
        errors.push('RFQ due date must be in the future')
      }

      if (data.required_quantity !== undefined && data.required_quantity <= 0) {
        errors.push('Required quantity must be greater than 0')
      }

      if (data.target_price !== undefined && data.target_price <= 0) {
        errors.push('Target price must be greater than 0')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  // INVENTORY MODULE
  GoodsReceipt: {
    canEdit: (gr: any) => {
      // Cannot edit completed or cancelled receipts
      return gr.status !== 'completed' && gr.status !== 'cancelled'
    },
    editableFields: (gr: any) => {
      if (gr.status === 'completed' || gr.status === 'cancelled') {
        return []
      }
      return ['expected_date', 'warehouse_id', 'notes', 'reference_po']
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.warehouse_id) {
        errors.push('Warehouse is required')
      }

      if (data.expected_date && new Date(data.expected_date) < new Date()) {
        errors.push('Expected date must be in the future')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  DeliveryOrder: {
    canEdit: (do_order: any) => {
      return do_order.status !== 'completed' && do_order.status !== 'cancelled'
    },
    editableFields: (do_order: any) => {
      if (do_order.status === 'completed' || do_order.status === 'cancelled') {
        return []
      }
      if (do_order.status === 'in_transit') {
        return ['notes', 'expected_delivery']
      }
      return [
        'customer_id',
        'warehouse_id',
        'delivery_address',
        'expected_delivery',
        'notes',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.customer_id) {
        errors.push('Customer is required')
      }

      if (!data.warehouse_id) {
        errors.push('Warehouse is required')
      }

      if (data.expected_delivery && new Date(data.expected_delivery) < new Date()) {
        errors.push('Expected delivery date must be in the future')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  InventoryAdjustment: {
    canEdit: (adj: any) => {
      // Cannot edit posted adjustments
      return adj.status !== 'posted' && adj.status !== 'cancelled'
    },
    editableFields: (adj: any) => {
      if (adj.status === 'posted' || adj.status === 'cancelled') {
        return []
      }
      return ['warehouse_id', 'reason', 'notes']
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.warehouse_id) {
        errors.push('Warehouse is required')
      }

      if (!data.reason || data.reason.trim() === '') {
        errors.push('Adjustment reason is required')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  // WAREHOUSE MODULE
  BinLocation: {
    canEdit: () => {
      // Can edit bin info regardless of status
      return true
    },
    editableFields: () => {
      return ['bin_name', 'warehouse_id', 'aisle', 'rack', 'level', 'max_capacity', 'status']
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.bin_name || data.bin_name.trim() === '') {
        errors.push('Bin name is required')
      }

      if (!data.warehouse_id) {
        errors.push('Warehouse is required')
      }

      if (data.max_capacity && data.max_capacity <= 0) {
        errors.push('Max capacity must be greater than 0')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  PutawayTask: {
    canEdit: (task: any) => {
      return task.status !== 'completed' && task.status !== 'cancelled'
    },
    editableFields: (task: any) => {
      if (task.status === 'completed' || task.status === 'cancelled') {
        return []
      }
      if (task.status === 'assigned') {
        return ['bin_location_id', 'notes']
      }
      return ['assigned_to', 'bin_location_id', 'priority', 'notes']
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.assigned_to && data.status !== 'unassigned') {
        errors.push('Assignee is required when task is active')
      }

      if (!data.bin_location_id && data.status !== 'unassigned') {
        errors.push('Bin location is required')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  PickingTask: {
    canEdit: (task: any) => {
      return task.status !== 'completed' && task.status !== 'cancelled'
    },
    editableFields: (task: any) => {
      if (task.status === 'completed' || task.status === 'cancelled') {
        return []
      }
      if (task.status === 'assigned') {
        return ['quantity_to_pick', 'notes']
      }
      return ['assigned_to', 'quantity_to_pick', 'priority', 'notes']
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.assigned_to && data.status !== 'unassigned') {
        errors.push('Assignee is required when task is active')
      }

      if (data.quantity_to_pick !== undefined && data.quantity_to_pick <= 0) {
        errors.push('Quantity must be greater than 0')
      }

      return { isValid: errors.length === 0, errors }
    },
  },

  StockTransfer: {
    canEdit: (transfer: any) => {
      return transfer.status !== 'confirmed' && transfer.status !== 'completed'
    },
    editableFields: (transfer: any) => {
      if (transfer.status === 'confirmed' || transfer.status === 'completed') {
        return ['notes']
      }
      return [
        'from_warehouse_id',
        'to_warehouse_id',
        'product_id',
        'quantity',
        'expected_receipt_date',
        'notes',
      ]
    },
    validate: (data: any) => {
      const errors: string[] = []

      if (!data.from_warehouse_id) {
        errors.push('Source warehouse is required')
      }

      if (!data.to_warehouse_id) {
        errors.push('Destination warehouse is required')
      }

      if (data.from_warehouse_id === data.to_warehouse_id) {
        errors.push('Source and destination warehouses must be different')
      }

      if (data.quantity !== undefined && data.quantity <= 0) {
        errors.push('Transfer quantity must be greater than 0')
      }

      if (data.expected_receipt_date && new Date(data.expected_receipt_date) < new Date()) {
        errors.push('Expected receipt date must be in the future')
      }

      return { isValid: errors.length === 0, errors }
    },
  },
}

/**
 * Get validation errors for a specific module
 */
export const validateEdit = (
  module: keyof typeof ValidationRules,
  data: any,
  originalData: any = null
) => {
  const rules = (ValidationRules as any)[module]
  if (!rules) {
    return { isValid: true, errors: [] }
  }

  return rules.validate(data, originalData)
}

/**
 * Check if a specific field is editable for a record
 */
export const isFieldEditable = (module: keyof typeof ValidationRules, field: string, record: any) => {
  const rules = (ValidationRules as any)[module]
  if (!rules) return true

  const editableFields = rules.editableFields(record)
  return editableFields.includes(field)
}

/**
 * Check if a record can be edited
 */
export const canEditRecord = (module: keyof typeof ValidationRules, record: any) => {
  const rules = (ValidationRules as any)[module]
  if (!rules) return true

  return rules.canEdit(record)
}

/**
 * Get all editable fields for a record
 */
export const getEditableFields = (module: keyof typeof ValidationRules, record: any) => {
  const rules = (ValidationRules as any)[module]
  if (!rules) return []

  return rules.editableFields(record)
}
