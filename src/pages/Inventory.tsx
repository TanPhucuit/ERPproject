import React, { useEffect, useMemo, useState } from 'react'
import { erpApi } from '../services/erpApi'
import {
  ActionToolbar,
  FormField,
  KanbanBoard,
  ModuleHeader,
  ModuleTabs,
  RecordActions,
  RecordModal,
  StatusBadge,
  ViewMode,
} from '../components/OdooLite'
import { useUIStore } from '../stores/uiStore'

const stockFieldsBase: FormField[] = [
  { name: 'warehouseName', label: 'Warehouse', type: 'select', required: true, options: [] },
  { name: 'productName', label: 'Product', type: 'select', required: true, options: [] },
  { name: 'binCode', label: 'Bin Location (Optional)', type: 'select', options: [] },
  { name: 'quantityOnHand', label: 'On Hand (Reserved Unpaid)', type: 'number', readonly: true, disabled: true },
  { name: 'totalQuantity', label: 'Total Quantity', type: 'number', readonly: true, disabled: true },
  { name: 'quantityAvailable', label: 'Available', type: 'number', readonly: true, disabled: true },
  { name: 'newQuantity', label: 'New Quantity', type: 'number', readonly: true, disabled: true },
  { name: 'reorderStatus', label: 'Reorder Status', type: 'text', readonly: true, disabled: true },
]

const movementFieldsBase: FormField[] = [
  { name: 'reference', label: 'Receipt #', type: 'text', readonly: true, disabled: true },
  { name: 'purchaseOrderId', label: 'Purchase Order', type: 'select', required: true, options: [] },
  { name: 'scheduledDate', label: 'Receipt Date', type: 'date' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'ready', label: 'Ready' },
      { value: 'delivering', label: 'Delivering' },
      { value: 'received', label: 'Received' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const deliveryFieldsBase: FormField[] = [
  { name: 'reference', label: 'Delivery #', type: 'text', readonly: true, disabled: true },
  { name: 'salesOrderId', label: 'Sales Order', type: 'select', options: [] },
  { name: 'invoiceId', label: 'Invoice', type: 'select', options: [] },
  { name: 'scheduledDate', label: 'Delivery Date', type: 'date' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'ready', label: 'Ready' },
      { value: 'delivering', label: 'Delivering' },
      { value: 'delivered', label: 'Delivered' },
    ],
  },
  { name: 'tracking_number', label: 'Tracking Number', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const transferFieldsBase: FormField[] = [
  { name: 'sourceWarehouseId', label: 'Source Warehouse', type: 'select', required: true, options: [] },
  { name: 'sourceBinLocationId', label: 'Source Bin Location', type: 'select', required: true, options: [] },
  { name: 'destWarehouseId', label: 'Destination Warehouse', type: 'select', required: true, options: [] },
  { name: 'destBinLocationId', label: 'Destination Bin Location', type: 'select', required: true, options: [] },
  { name: 'productId', label: 'Product', type: 'select', required: true, options: [] },
  { name: 'quantity', label: 'Quantity', type: 'number', required: true },
  { name: 'transferDate', label: 'Transfer Date', type: 'date' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const TransferModal: React.FC<{
  isOpen: boolean
  record: any
  deliveries: any[]
  warehouses: any[]
  binLocations: any[]
  binStock: any[]
  stockLevels: any[]
  products: any[]
  onClose: () => void
  onSave: (record: any) => void
}> = ({ isOpen, record, deliveries, warehouses, binLocations, binStock, stockLevels, products, onClose, onSave }) => {
  const [form, setForm] = useState<any>({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setForm({
      transferType: record?.transferType || 'internal',
      deliveryOrderId: record?.deliveryOrderId || '',
      sourceBinLocationId: record?.sourceBinLocationId || 'new',
      destBinLocationId: record?.destBinLocationId || '',
      productId: record?.productId || '',
      quantity: record?.quantity || 1,
      notes: record?.notes || '',
      deliveryLines: record?.deliveryLines || [],
    })
    setFormError('')
  }, [record, isOpen])

  const selectedDelivery = deliveries.find((delivery) => delivery.id === form.deliveryOrderId)
  const deliveryOptions = deliveries.filter((delivery) => !['delivered', 'delivering', 'cancelled'].includes(delivery.status))
  const orderLines = (selectedDelivery?.sales_order?.items || []).map((item: any) => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product?.product_name || item.product_name || item.product_id,
    product_sku: item.product?.sku || '',
    quantity: item.quantity || 1,
  }))

  useEffect(() => {
    if (!selectedDelivery || form.transferType !== 'customer_delivery') return
    const nextLines = orderLines.map((line: any) => {
      const existing = (form.deliveryLines || []).find((item: any) => item.product_id === line.product_id)
      const existingItem = (selectedDelivery.items || []).find((item: any) => item.product_id === line.product_id)
      const binId = existing?.bin_location_id || existingItem?.bin_location_id || ''
      const bin = binLocations.find((item) => item.id === binId)
      return {
        ...line,
        warehouse_id: existing?.warehouse_id || bin?.warehouse_id || '',
        bin_location_id: binId,
      }
    })
    setForm((current: any) => ({ ...current, deliveryLines: nextLines }))
  }, [form.deliveryOrderId, form.transferType])

  if (!isOpen) return null

  const updateDeliveryLine = (productId: string, key: string, value: string) => {
    setForm((current: any) => ({
      ...current,
      deliveryLines: (current.deliveryLines || []).map((line: any) => {
        if (line.product_id !== productId) return line
        const next = { ...line, [key]: value }
        if (key === 'warehouse_id') next.bin_location_id = ''
        return next
      }),
    }))
  }

  const binOptionsForLine = (line: any) => {
    const availableBinIds = new Set(
      binStock
        .filter((row) => row.product_id === line.product_id && Number(row.available ?? 0) >= Number(line.quantity || 0))
        .map((row) => row.bin_location_id)
    )
    return binLocations
      .filter((bin) => (!line.warehouse_id || bin.warehouse_id === line.warehouse_id) && availableBinIds.has(bin.id))
      .map((bin) => {
        const stockRow = binStock.find((row) => row.product_id === line.product_id && row.bin_location_id === bin.id)
        return { ...bin, available: stockRow?.available ?? 0 }
      })
  }

  const internalProduct = products.find((product) => product.id === form.productId)
  const newStockProductOptions = stockLevels
    .filter((row) => Number(row.newQuantity ?? row.new_quantity ?? 0) > 0)
    .map((row) => ({
      product: products.find((product) => product.id === row.product_id) || row.product,
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouseName || row.warehouse?.warehouse_name,
      new_quantity: Number(row.newQuantity ?? row.new_quantity ?? 0),
    }))
    .filter((row) => row.product?.id)
  const isNewStockTransfer = form.sourceBinLocationId === 'new'
  const selectedNewStock = newStockProductOptions.find((row) => row.product.id === form.productId)
  const sourceBinOptions = [
    { id: 'new', label: 'New stock' },
    ...Array.from(
      new Map(
        binStock
          .filter((row) => Number(row.available ?? 0) > 0)
          .map((row) => [
            row.bin_location_id,
            {
              id: row.bin_location_id,
              label: `${row.binCode || row.bin_location?.location_code || row.bin_location?.bin_code || row.bin_location_id} - ${row.warehouseName || row.bin_location?.warehouse?.warehouse_name || ''}`,
            },
          ])
      ).values()
    ),
  ]
  const binProductOptions = isNewStockTransfer
    ? []
    : binStock
      .filter((row) => row.bin_location_id === form.sourceBinLocationId && Number(row.available ?? 0) > 0)
      .map((row) => ({
        product: products.find((product) => product.id === row.product_id) || row.product,
        available: Number(row.available ?? 0),
      }))
      .filter((row) => row.product?.id)
  const selectedBinStock = binStock.find((row) => row.bin_location_id === form.sourceBinLocationId && row.product_id === form.productId)
  const destinationBins = isNewStockTransfer && selectedNewStock?.warehouse_id
    ? binLocations.filter((bin) => bin.warehouse_id === selectedNewStock.warehouse_id)
    : binLocations

  const handleSave = () => {
    if (form.transferType === 'customer_delivery') {
      if (!form.deliveryOrderId) {
        setFormError('Please select a delivery order.')
        return
      }
      if ((form.deliveryLines || []).some((line: any) => !line.bin_location_id)) {
        setFormError('Please select warehouse and bin for every delivery product.')
        return
      }
      setFormError('')
      onSave({
        ...record,
        ...form,
        transfer_type: 'customer_delivery',
        delivery_order_id: form.deliveryOrderId,
        lines: (form.deliveryLines || []).map((line: any) => ({
          product_id: line.product_id,
          bin_location_id: line.bin_location_id,
          quantity: line.quantity,
        })),
      })
      return
    }

    setFormError('')
    onSave({
      ...record,
      ...form,
      productId: form.productId,
      quantity: isNewStockTransfer ? Math.min(Number(form.quantity || 1), selectedNewStock?.new_quantity || Number(form.quantity || 1)) : form.quantity,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="mt-4 mb-8 w-full max-w-5xl rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Create Stock Transfer</h2>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100">x</button>
        </div>
        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {formError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Transfer Type</label>
              <select value={form.transferType || 'internal'} onChange={(event) => setForm({ ...form, transferType: event.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="internal">Transfer between bins</option>
                <option value="customer_delivery">Ship to customer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Notes</label>
              <input value={form.notes || ''} onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          {form.transferType === 'customer_delivery' ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Delivery Order</label>
                <select value={form.deliveryOrderId || ''} onChange={(event) => setForm({ ...form, deliveryOrderId: event.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Select delivery order...</option>
                  {deliveryOptions.map((delivery) => (
                    <option key={delivery.id} value={delivery.id}>
                      {(delivery.delivery_order_number || delivery.reference || delivery.id?.slice(0, 8))} - {delivery.sales_order?.order_number || delivery.sales_order?.sales_order_number || delivery.sales_order_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {(form.deliveryLines || []).map((line: any) => (
                  <div key={line.product_id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{line.product_name}</p>
                        <p className="text-xs text-gray-500">{line.product_sku} - Qty {line.quantity}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-700">Warehouse</label>
                        <select value={line.warehouse_id || ''} onChange={(event) => updateDeliveryLine(line.product_id, 'warehouse_id', event.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
                          <option value="">Select warehouse...</option>
                          {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.warehouse_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-700">Bin Location</label>
                        <select value={line.bin_location_id || ''} onChange={(event) => updateDeliveryLine(line.product_id, 'bin_location_id', event.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
                          <option value="">Select bin...</option>
                          {binOptionsForLine(line).map((bin) => (
                            <option key={bin.id} value={bin.id}>{bin.location_code || bin.bin_code} - available {bin.available}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Source Bin</label>
                <select value={form.sourceBinLocationId || ''} onChange={(event) => setForm({ ...form, sourceBinLocationId: event.target.value, productId: '', quantity: 1 })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {sourceBinOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Product</label>
                <select value={form.productId || ''} onChange={(event) => setForm({ ...form, productId: event.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Select product...</option>
                  {isNewStockTransfer
                    ? newStockProductOptions.map((row) => (
                      <option key={`${row.product.id}-${row.warehouse_id}`} value={row.product.id}>
                        {row.product.name || row.product.product_name} ({row.product.sku}) - new {row.new_quantity} - {row.warehouse_name}
                      </option>
                    ))
                    : binProductOptions.map((row) => (
                      <option key={row.product.id} value={row.product.id}>
                        {row.product.name || row.product.product_name} ({row.product.sku}) - available {row.available}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Quantity</label>
                <input type="number" min={1} max={isNewStockTransfer ? selectedNewStock?.new_quantity : selectedBinStock?.available} value={form.quantity || 1} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                {isNewStockTransfer && selectedNewStock && <p className="mt-1 text-xs text-gray-500">New quantity available: {selectedNewStock.new_quantity}</p>}
                {!isNewStockTransfer && selectedBinStock && <p className="mt-1 text-xs text-gray-500">Available in source bin: {selectedBinStock.available}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Destination Bin</label>
                <select value={form.destBinLocationId || ''} onChange={(event) => setForm({ ...form, destBinLocationId: event.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Select destination bin...</option>
                  {destinationBins.map((bin) => (
                    <option key={bin.id} value={bin.id}>{bin.location_code || bin.bin_code} - {bin.warehouseName}</option>
                  ))}
                </select>
              </div>
              {internalProduct && <p className="text-sm text-gray-500 md:col-span-2">Selected product: {internalProduct.name || internalProduct.product_name}</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white">Cancel</button>
          <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save Transfer</button>
        </div>
      </div>
    </div>
  )
}

const flow: Record<string, Record<string, string>> = {
  deliveries: {
    delivering: 'delivered',
  },
  receipts: {
    delivering: 'received',
  },
}

const InventoryModule: React.FC = () => {
  const showNotification = useUIStore((state) => state.showNotification)
  const [activeTab, setActiveTab] = useState('stock')
  const [stock, setStock] = useState<any[]>([])
  const [binStock, setBinStock] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [binLocations, setBinLocations] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalRecord, setModalRecord] = useState<any>(null)

  useEffect(() => {
    erpApi
      .get<any[]>('/inventory/stock-levels?limit=100')
      .then((records) => {
        setLoadError(null)
        setStock(
          records.map((item) => ({
            ...item,
            warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
            productName: item.product?.product_name || item.product?.name || item.productName || item.product_id,
            binCode: item.bin_location?.bin_code || '',
            bin: item.bin_location || null,
            quantityOnHand: item.quantity_on_hand || 0,
            totalQuantity: item.total_quantity || 0,
            quantityAvailable: item.available ?? item.quantityAvailable ?? item.quantity_available ?? 0,
            newQuantity: item.new_quantity || 0,
            reorderStatus: item.reorder_status || 'normal',
          }))
        )
      })
      .catch((error) => {
        setStock([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/inventory/stock-in-bins?limit=500')
      .then((records) => {
        setLoadError(null)
        setBinStock(records.map((item) => ({
          ...item,
          productName: item.productName || item.product?.product_name || item.product?.name || item.product_id,
          warehouseName: item.warehouseName || item.bin_location?.warehouse?.warehouse_name || '',
          binCode: item.binCode || item.bin_location?.location_code || item.bin_location?.bin_code || '',
          quantity: item.quantity || 0,
          available: item.available || 0,
          occupancyQuantity: item.occupancyQuantity || item.quantity || 0,
        })))
      })
      .catch((error) => {
        setBinStock([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/inventory/delivery-orders?limit=100')
      .then((records) => {
        setLoadError(null)
        setDeliveries(records.map((item) => ({
          ...item,
          reference: item.delivery_order_number || item.id?.slice(0, 8),
          salesOrderId: item.sales_order_id,
          partnerName: item.sales_order?.order_number || item.sales_order?.sales_order_number || item.sales_order_id,
          warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
          scheduledDate: item.delivery_date || item.scheduled_delivery_date,
        })))
      })
      .catch((error) => {
        setDeliveries([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/inventory/goods-receipts?limit=100')
      .then((records) => {
        setLoadError(null)
        setReceipts(records.map((item) => ({
          ...item,
          reference: item.id?.slice(0, 8),
          purchaseOrderId: item.purchase_order_id,
          partnerName: item.recordType === 'customer_return' || item.receipt_type === 'customer_return'
            ? `${item.customerName || item.customer?.name || 'Customer'} - ${item.sales_order_number || item.sales_order?.order_number || 'SO'}`
            : item.purchase_order?.order_number || item.purchase_order_id || 'Purchase Order',
          warehouseName: item.recordType === 'customer_return' || item.receipt_type === 'customer_return'
            ? 'Customer Return'
            : 'Receiving',
          scheduledDate: item.receipt_date,
        })))
      })
      .catch((error) => {
        setReceipts([])
        setLoadError(error.message)
      })

    erpApi
      .get<any[]>('/inventory/stock-transfers?limit=100')
      .then((records) => {
        setLoadError(null)
        setTransfers(records.map((item) => ({
          ...item,
          reference: item.transfer_number,
          sourceWarehouseId: item.source_warehouse_id,
          destWarehouseId: item.dest_warehouse_id,
          sourceWarehouseName: item.sourceWarehouseName || item.source_warehouse?.name || item.source_warehouse_id,
          destWarehouseName: item.destWarehouseName || item.dest_warehouse?.name || item.dest_warehouse_id,
          transferDate: item.transfer_date,
          productId: item.lines?.[0]?.product_id || '',
          sourceBinLocationId: item.lines?.[0]?.from_bin_location_id || '',
          destBinLocationId: item.lines?.[0]?.to_bin_location_id || '',
          quantity: item.lines?.[0]?.quantity || 1,
        })))
      })
      .catch((error) => {
        setTransfers([])
        setLoadError(error.message)
      })
  }, [])

  useEffect(() => {
    Promise.all([
      erpApi.get<any[]>('/warehouse/warehouses'),
      erpApi.get<any[]>('/customers?limit=1000'),
      erpApi.get<any[]>('/suppliers?limit=1000'),
      erpApi.get<any[]>('/products?limit=1000'),
      erpApi.get<any[]>('/warehouse/bin-locations?limit=1000'),
      erpApi.get<any[]>('/sales-orders?limit=1000'),
      erpApi.get<any[]>('/accounting/invoices?limit=1000'),
      erpApi.get<any[]>('/purchase/purchase-orders?limit=1000'),
    ])
      .then(([warehouseData, customerData, supplierData, productData, binData, salesOrderData, invoiceData, purchaseOrderData]) => {
        setWarehouses(warehouseData)
        setCustomers(customerData)
        setSuppliers(supplierData)
        setProducts(productData)
        setBinLocations(binData)
        setSalesOrders(salesOrderData)
        setInvoices(invoiceData)
        setPurchaseOrders(purchaseOrderData)
      })
      .catch(() => {
        setWarehouses([])
        setCustomers([])
        setSuppliers([])
        setProducts([])
        setBinLocations([])
        setSalesOrders([])
        setInvoices([])
        setPurchaseOrders([])
      })
  }, [])

  const activeSetters: Record<string, React.Dispatch<React.SetStateAction<any[]>>> = {
    stock: setStock,
    'bin-stock': setBinStock,
    deliveries: setDeliveries,
    receipts: setReceipts,
    transfers: setTransfers,
  }
  const activeRecords = activeTab === 'stock'
    ? stock
      : activeTab === 'bin-stock'
        ? binStock
        : activeTab === 'deliveries'
        ? deliveries
        : activeTab === 'receipts'
          ? receipts
          : activeTab === 'transfers'
            ? transfers
            : receipts
  const warehouseOptions = useMemo(
    () => warehouses.map((warehouse) => {
      const label = `${warehouse.name || warehouse.warehouse_name}`
      return { value: warehouse.name, label }
    }),
    [warehouses]
  )
  const productOptions = useMemo(
    () => products.map((product) => ({ value: activeTab === 'transfers' ? product.id : product.name, label: `${product.name} (${product.sku})` })),
    [activeTab, products]
  )
  const transferWarehouseOptions = useMemo(
    () => warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name || warehouse.warehouse_name })),
    [warehouses]
  )
  const transferBinOptions = useMemo(
    () => binLocations.map((bin) => ({ value: bin.id, label: `${bin.binCode || bin.bin_code} - ${bin.warehouseName || bin.warehouse?.name || ''}` })),
    [binLocations]
  )
  const sourceStockBinOptions = useMemo(() => {
    const selectedProductId = modalRecord?.productId
    const stockOptions = binStock
      .filter((row) => !selectedProductId || row.product_id === selectedProductId)
      .filter((row) => Number(row.available ?? 0) > 0)
      .map((row) => ({
        value: row.bin_location_id,
        label: `${row.binCode || row.bin_location?.location_code || row.bin_location_id} - ${row.productName || row.product?.product_name || ''} (available ${row.available ?? 0})`,
      }))
    return [{ value: 'new', label: 'New stock (from received goods)' }, ...stockOptions]
  }, [binStock, modalRecord?.productId])
  const partnerOptions = useMemo(() => {
    const source = activeTab === 'deliveries' ? customers : suppliers
    return source.map((partner) => ({ value: partner.name, label: partner.name }))
  }, [activeTab, customers, suppliers])
  const salesOrderOptions = useMemo(
    () => salesOrders.map((order) => ({
      value: order.id,
      label: `${order.sales_order_number || order.order_number || order.id?.slice(0, 8)} - ${order.customer?.name || order.customer_name || 'Customer'}`,
    })),
    [salesOrders]
  )
  const invoiceOptions = useMemo(
    () => invoices.map((invoice) => ({
      value: invoice.id,
      label: `${invoice.invoice_number || invoice.id?.slice(0, 8)} - ${invoice.sales_order?.order_number || invoice.sales_order?.sales_order_number || invoice.sales_order_id || 'Sales Order'}`,
    })),
    [invoices]
  )
  const invoiceBySalesOrder = useMemo(() => {
    const map = new Map<string, any>()
    invoices.forEach((invoice) => {
      if (invoice.sales_order_id && !map.has(invoice.sales_order_id)) map.set(invoice.sales_order_id, invoice)
    })
    return map
  }, [invoices])
  const purchaseOrderOptions = useMemo(
    () => purchaseOrders.map((order) => ({
      value: order.id,
      label: `${order.purchase_order_number || order.order_number || order.id?.slice(0, 8)} - ${order.supplier?.name || order.supplier?.supplier_name || 'Supplier'}`,
    })),
    [purchaseOrders]
  )
  const filteredBinOptions = useMemo(() => {
    const selectedWarehouse = modalRecord?.warehouseName
    const source = selectedWarehouse
      ? binLocations.filter((bin) => bin.warehouseName === selectedWarehouse)
      : binLocations
    // Add occupancy % to display
    return source.map((bin) => {
      const label = `${bin.binCode || bin.bin_code} - ${bin.warehouseName || ''}`
      return { value: bin.binCode, label }
    })
  }, [binLocations, modalRecord?.warehouseName])
  const activeFields = useMemo(() => {
    const source = activeTab === 'stock'
      ? stockFieldsBase
      : activeTab === 'deliveries'
        ? deliveryFieldsBase
        : activeTab === 'transfers'
          ? transferFieldsBase
          : movementFieldsBase
    return source.map((field) => {
      if (['sourceWarehouseId', 'destWarehouseId'].includes(field.name)) return { ...field, options: transferWarehouseOptions }
      if (field.name === 'sourceBinLocationId') return { ...field, options: sourceStockBinOptions }
      if (field.name === 'destBinLocationId') return { ...field, options: transferBinOptions }
      if (field.name === 'productId') return { ...field, options: productOptions }
      if (field.name === 'warehouseName') return { ...field, options: warehouseOptions }
      if (field.name === 'productName') return { ...field, options: productOptions }
      if (field.name === 'salesOrderId') return { ...field, options: salesOrderOptions }
      if (field.name === 'invoiceId') return { ...field, options: invoiceOptions }
      if (field.name === 'purchaseOrderId') return { ...field, options: purchaseOrderOptions }
      if (field.name === 'partnerName') return { ...field, label: activeTab === 'deliveries' ? 'Customer' : 'Supplier', options: partnerOptions }
      if (field.name === 'binCode') return { ...field, options: filteredBinOptions }
      return field
    })
  }, [activeTab, warehouseOptions, transferWarehouseOptions, transferBinOptions, sourceStockBinOptions, productOptions, salesOrderOptions, invoiceOptions, purchaseOrderOptions, partnerOptions, filteredBinOptions])
  const activeTitle = activeTab === 'stock' ? 'Stock Level' : activeTab === 'bin-stock' ? 'Bin Stock' : activeTab === 'deliveries' ? 'Delivery Order' : activeTab === 'receipts' ? 'Goods Receipt' : 'Stock Transfer'

  const filteredRecords = useMemo(() => {
    return activeRecords.filter((record) => {
      const haystack = `${record.reference || record.productName} ${record.partnerName || ''} ${record.warehouseName} ${record.binCode || ''}`.toLowerCase()
      return haystack.includes(search.toLowerCase()) && (status === 'all' || record.status === status)
    })
  }, [activeRecords, search, status])

  const openCreate = () => {
    if (activeTab === 'stock' || activeTab === 'bin-stock') {
      showNotification('info', 'Stock figures are system-managed from orders, receipts, deliveries, and transfers.')
      return
    }
    setModalRecord({
      id: `${activeTab}-${Date.now()}`,
      reference: `${activeTab.toUpperCase()}-${Date.now().toString().slice(-5)}`,
      salesOrderId: '',
      invoiceId: '',
      purchaseOrderId: '',
      warehouseName: '',
      productName: '',
      partnerName: '',
      binCode: '',
      quantityOnHand: 0,
      totalQuantity: 0,
      quantityAvailable: 0,
      newQuantity: 0,
      reorderStatus: activeTab === 'stock' ? 'normal' : 'ready',
      scheduledDate: new Date().toISOString().slice(0, 10),
      transferDate: new Date().toISOString().slice(0, 10),
      sourceWarehouseId: '',
      destWarehouseId: '',
      sourceBinLocationId: activeTab === 'transfers' ? 'new' : '',
      destBinLocationId: '',
      productId: '',
      quantity: 1,
      status: activeTab === 'receipts' ? 'ready' : activeTab === 'deliveries' ? 'ready' : undefined,
    })
    setModalOpen(true)
  }

  const saveRecord = async (record: any) => {
    const path = activeTab === 'deliveries'
      ? '/inventory/delivery-orders'
      : activeTab === 'receipts'
        ? '/inventory/goods-receipts'
        : activeTab === 'transfers'
          ? '/inventory/stock-transfers'
          : '/inventory/stock-levels'

    try {
      const isExisting = record.id && activeRecords.some((item) => item.id === record.id)
      const selectedInvoice = invoices.find((invoice) => invoice.id === record.invoiceId)
      if (activeTab === 'deliveries' && !record.salesOrderId && !selectedInvoice?.sales_order_id) {
        showNotification('error', 'Please select a Sales Order or an Invoice for this delivery order.')
        return
      }
      if (activeTab === 'receipts' && !record.purchaseOrderId) {
        showNotification('error', 'Please select a Purchase Order for this receipt.')
        return
      }
      if (activeTab === 'transfers' && record.sourceBinLocationId !== 'new') {
        if (record.transfer_type === 'customer_delivery') {
          const missingStock = (record.lines || []).find((line: any) => {
            const sourceBin = binStock.find((row) => row.product_id === line.product_id && row.bin_location_id === line.bin_location_id)
            return !sourceBin || Number(sourceBin.available ?? 0) < Number(line.quantity || 0)
          })
          if (missingStock) {
            showNotification('error', 'Selected bin does not have enough available stock for this delivery.')
            return
          }
        } else {
        const sourceBin = binStock.find((row) => row.product_id === record.productId && row.bin_location_id === record.sourceBinLocationId)
        if (!sourceBin || Number(sourceBin.available ?? 0) < Number(record.quantity || 0)) {
          showNotification('error', 'Selected source bin does not have enough available stock for this transfer.')
          return
        }
        }
      }
      if (activeTab === 'transfers' && record.sourceBinLocationId === 'new') {
        const selectedStock = stock.find((row) => row.product_id === record.productId && Number(row.newQuantity ?? row.new_quantity ?? 0) > 0)
        if (!selectedStock || Number(selectedStock.newQuantity ?? selectedStock.new_quantity ?? 0) < Number(record.quantity || 0)) {
          showNotification('error', 'Selected product does not have enough new supplier stock to transfer.')
          return
        }
      }
      const payload = activeTab === 'deliveries'
        ? {
            sales_order_id: record.salesOrderId || selectedInvoice?.sales_order_id,
            delivery_date: record.scheduledDate,
            status: record.status || 'ready',
            tracking_number: record.tracking_number || null,
            notes: record.notes || null,
          }
        : activeTab === 'receipts'
          ? {
            purchase_order_id: record.purchaseOrderId,
            receipt_date: record.scheduledDate,
            status: record.status || 'ready',
            notes: record.notes || null,
          }
        : activeTab === 'transfers'
          ? record.transfer_type === 'customer_delivery'
            ? {
              transfer_type: 'customer_delivery',
              delivery_order_id: record.delivery_order_id,
              lines: record.lines || [],
              status: 'delivering',
              notes: record.notes || null,
            }
            : {
            product_id: record.productId,
            src_bin_location_id: record.sourceBinLocationId,
            target_bin_location_id: record.destBinLocationId,
            quantity: record.quantity,
            note: record.notes || null,
          }
          : record
      const saved = await (isExisting ? erpApi.put<any>(`${path}/${record.id}`, payload) : erpApi.post<any>(path, payload))
      if (activeTab === 'transfers' && record.transfer_type === 'customer_delivery') {
        setDeliveries((current) => current.map((delivery) => (
          delivery.id === record.delivery_order_id ? { ...delivery, ...saved, status: 'delivering' } : delivery
        )))
        setBinStock((current) => current.map((row) => {
          const shippedLine = (record.lines || []).find((line: any) => line.product_id === row.product_id && line.bin_location_id === row.bin_location_id)
          if (!shippedLine) return row
          return {
            ...row,
            quantity: Math.max(Number(row.quantity || 0) - Number(shippedLine.quantity || 0), 0),
            available: Math.max(Number(row.available || 0) - Number(shippedLine.quantity || 0), 0),
            occupancyQuantity: Math.max(Number(row.occupancyQuantity || row.quantity || 0) - Number(shippedLine.quantity || 0), 0),
          }
        }))
        showNotification('success', 'Delivery order moved to delivering and stock was deducted from selected bins.')
        setModalOpen(false)
        return
      }
      if (activeTab === 'transfers' && record.sourceBinLocationId === 'new') {
        setStock((current) => current.map((row) => (
          row.product_id === record.productId
            ? { ...row, newQuantity: Math.max(Number(row.newQuantity ?? row.new_quantity ?? 0) - Number(record.quantity || 0), 0), new_quantity: Math.max(Number(row.newQuantity ?? row.new_quantity ?? 0) - Number(record.quantity || 0), 0) }
            : row
        )))
        setBinStock((current) => {
          const existing = current.find((row) => row.product_id === record.productId && row.bin_location_id === record.destBinLocationId)
          if (existing) {
            return current.map((row) => row.product_id === record.productId && row.bin_location_id === record.destBinLocationId
              ? {
                ...row,
                quantity: Number(row.quantity || 0) + Number(record.quantity || 0),
                available: Number(row.available || 0) + Number(record.quantity || 0),
                occupancyQuantity: Number(row.occupancyQuantity || row.quantity || 0) + Number(record.quantity || 0),
              }
              : row)
          }
          return current
        })
      }
      activeSetters[activeTab]((current) => {
        const normalized = { ...record, ...saved }
        const exists = current.some((item) => item.id === record.id)
        return exists ? current.map((item) => (item.id === record.id ? normalized : item)) : [normalized, ...current]
      })
    } catch (error: any) {
      showNotification('error', `Inventory save failed: ${error.message}`)
      return
    }
    setModalOpen(false)
  }

  const advanceRecord = async (record: any) => {
    const nextStatus = flow[activeTab]?.[record.status]
    if (!nextStatus) return
    const pathMap: Record<string, string> = {
      deliveries: '/inventory/delivery-orders',
      receipts: '/inventory/goods-receipts',
      transfers: '/inventory/stock-transfers',
    }
    const path = pathMap[activeTab]
    if (!path) return
    try {
      await erpApi.put(`${path}/${record.id}`, { ...record, status: nextStatus })
      activeSetters[activeTab]((current) => current.map((item) => (item.id === record.id ? { ...item, status: nextStatus } : item)))
      if (activeTab === 'receipts' && (record.recordType === 'customer_return' || record.receipt_type === 'customer_return')) {
        const records = await erpApi.get<any[]>('/inventory/stock-levels?limit=100')
        setStock(records.map((item) => ({
          ...item,
          warehouseName: item.warehouse?.warehouse_name || item.warehouse?.name || item.warehouse_id,
          productName: item.product?.product_name || item.product?.name || item.productName || item.product_id,
          quantityOnHand: item.quantity_on_hand || 0,
          totalQuantity: item.total_quantity || 0,
          quantityAvailable: item.available ?? item.quantityAvailable ?? item.quantity_available ?? 0,
          newQuantity: item.new_quantity || 0,
          reorderStatus: item.reorder_status || 'normal',
        })))
      }
      showNotification('success', `${activeTitle} moved to ${nextStatus}.`)
    } catch (error: any) {
      showNotification('error', `Status update failed: ${error.message}`)
    }
  }

  const deleteRecord = async (record: any) => {
    const pathMap: Record<string, string> = {
      deliveries: '/inventory/delivery-orders',
      receipts: '/inventory/goods-receipts',
      transfers: '/inventory/stock-transfers',
    }
    const path = pathMap[activeTab]
    const recordName = record.delivery_order_number || record.goods_receipt_number || record.adjustment_number || record.reference || 'this record'
    if (!window.confirm(`Delete ${recordName}?`)) return
    try {
      await erpApi.delete(`${path}/${record.id}`)
    } catch (error: any) {
      showNotification('error', `Inventory delete failed: ${error.message}`)
      return
    }
    activeSetters[activeTab]((current) => current.filter((item) => item.id !== record.id))
    showNotification('success', `${activeTitle} deleted.`)
  }

  const renderActions = (record: any) => (
    activeTab === 'receipts' && (record.recordType === 'customer_return' || record.receipt_type === 'customer_return') ? (
      <div className="flex items-center gap-1">
        {flow[activeTab]?.[record.status] && (
          <button onClick={() => advanceRecord(record)} className="rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
            Receive
          </button>
        )}
      </div>
    ) : (
      <RecordActions
        onEdit={() => {
          setModalRecord(record)
          setModalOpen(true)
        }}
        onDelete={() => deleteRecord(record)}
        onAdvance={flow[activeTab]?.[record.status] ? () => advanceRecord(record) : undefined}
        advanceLabel={activeTab === 'receipts' ? 'Receive' : 'Delivered'}
      />
    )
  )

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Inventory"
        subtitle="Track reserved order stock in Stock Levels and physical availability in Stock in Bins."
        primaryLabel={activeTab === 'stock' || activeTab === 'bin-stock' ? 'Managed Automatically' : `New ${activeTitle}`}
        onCreate={openCreate}
      />

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load inventory data from backend: {loadError}
        </div>
      )}

      <ModuleTabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab)
          setSearch('')
          setStatus('all')
        }}
        tabs={[
          { id: 'stock', label: 'Stock Levels', count: stock.length },
          { id: 'bin-stock', label: 'Stock in Bins', count: binStock.length },
          { id: 'deliveries', label: 'Delivery Orders', count: deliveries.length },
          { id: 'receipts', label: 'Goods Receipts', count: receipts.length },
          { id: 'transfers', label: 'Stock Transfers', count: transfers.length },
        ]}
      />

      <ActionToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        statuses={Array.from(new Set(activeRecords.map((record) => record.status).filter(Boolean)))}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                {activeTab === 'stock' ? (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Warehouse</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">On Hand (Reserved Unpaid)</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Available</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reorder Status</th>
                  </>
                ) : activeTab === 'bin-stock' ? (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Warehouse</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bin</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Available</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Occupancy</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Reference</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Warehouse</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'deliveries' ? 'Sales Order / Invoice' : 'Partner'}</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </>
                )}
                {activeTab !== 'stock' && activeTab !== 'bin-stock' && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {activeTab === 'stock' ? (
                    <>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{record.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.warehouseName}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{record.quantityOnHand ?? 0}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{record.totalQuantity ?? record.total_quantity ?? 0}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{record.quantityAvailable ?? 0}</td>
                      <td className="px-4 py-3"><StatusBadge status={record.reorderStatus || 'optimal'} /></td>
                    </>
                  ) : activeTab === 'bin-stock' ? (
                    <>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{record.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.warehouseName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.binCode}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{record.quantity ?? 0}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{record.available ?? 0}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{record.occupancyQuantity ?? record.quantity ?? 0}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-semibold text-blue-700">{record.reference || record.delivery_order_number || record.goods_receipt_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{activeTab === 'transfers' ? `${record.sourceWarehouseName || record.sourceWarehouseId} -> ${record.destWarehouseName || record.destWarehouseId}` : record.warehouseName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {activeTab === 'transfers'
                          ? `Qty ${record.quantity || 0}`
                          : activeTab === 'deliveries'
                            ? `${record.sales_order?.order_number || record.sales_order?.sales_order_number || record.partnerName || record.salesOrderId || '-'}${invoiceBySalesOrder.get(record.sales_order_id || record.salesOrderId)?.invoice_number ? ` / ${invoiceBySalesOrder.get(record.sales_order_id || record.salesOrderId)?.invoice_number}` : ''}`
                            : record.partnerName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.scheduledDate || record.transferDate || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                    </>
                  )}
                  {activeTab !== 'stock' && activeTab !== 'bin-stock' && <td className="px-4 py-3">{renderActions(record)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <KanbanBoard
          records={filteredRecords}
          groupBy={(record) => record.status}
          renderCard={(record) => (
            <div key={record.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <p className="font-bold text-gray-900">{record.reference || record.productName}</p>
              <p className="mt-1 text-sm text-gray-600">{record.warehouseName}</p>
              <p className="mt-2 text-sm text-gray-600">{record.partnerName || record.binCode}</p>
              <div className="mt-3">{renderActions(record)}</div>
            </div>
          )}
        />
      )}

      {activeTab === 'transfers' ? (
        <TransferModal
          isOpen={modalOpen}
          record={modalRecord}
          deliveries={deliveries}
          warehouses={warehouses}
          binLocations={binLocations}
          binStock={binStock}
          stockLevels={stock}
          products={products}
          onClose={() => setModalOpen(false)}
          onSave={saveRecord}
        />
      ) : (
        <RecordModal
          isOpen={modalOpen}
          title={`${modalRecord && activeRecords.some((item) => item.id === modalRecord.id) ? 'Edit' : 'Create'} ${activeTitle}`}
          record={modalRecord}
          fields={activeFields}
          onClose={() => setModalOpen(false)}
          onSave={saveRecord}
        />
      )}
    </div>
  )
}

export default InventoryModule
