import express, { Request, Response } from 'express'
import { inventoryService } from '../services/inventoryService'
import { AuthRequest, authMiddleware } from '../middleware/auth'
import { supabaseClient } from '../config/supabase'

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)

// ============= GOODS RECEIPTS =============

router.get('/goods-receipts', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
    const { data, error } = await supabaseClient
      .from('goods_receipts')
      .select('*, purchase_order:purchase_orders(*), warehouse:warehouses(*)')
      .order('received_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/goods-receipts', async (req: AuthRequest, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const gr = await inventoryService.createGoodsReceipt(payload)
    res.status(201).json({ success: true, data: gr })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/goods-receipts/:id', async (req: Request, res: Response) => {
  try {
    const gr = await inventoryService.getGoodsReceiptById(req.params.id)
    res.json({ success: true, data: gr })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/goods-receipt-lines/:lineId/record', async (req: Request, res: Response) => {
  try {
    const { quantityReceived, binLocationId, serialNumbers } = req.body
    const result = await inventoryService.recordGoodsReceiptLine(req.params.lineId, quantityReceived, binLocationId, serialNumbers)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/goods-receipts/:id/complete', async (req: Request, res: Response) => {
  try {
    const gr = await inventoryService.completeGoodsReceipt(req.params.id)
    res.json({ success: true, data: gr })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= DELIVERY ORDERS =============

router.get('/delivery-orders', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
    const { data, error } = await supabaseClient
      .from('delivery_orders')
      .select('*, sales_order:sales_orders(*), warehouse:warehouses(*)')
      .order('scheduled_delivery_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/delivery-orders', async (req: AuthRequest, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const do_ = await inventoryService.createDeliveryOrder(payload)
    res.status(201).json({ success: true, data: do_ })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/delivery-order-lines/:lineId/pick', async (req: Request, res: Response) => {
  try {
    const { binLocationId, quantity } = req.body
    const result = await inventoryService.pickItemsForDelivery(req.params.lineId, binLocationId, quantity)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/delivery-orders/:id/complete', async (req: Request, res: Response) => {
  try {
    const { trackingNumber } = req.body
    const do_ = await inventoryService.completeDelivery(req.params.id, trackingNumber)
    res.json({ success: true, data: do_ })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= INVENTORY ADJUSTMENTS =============

router.get('/adjustments', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
    const { data, error } = await supabaseClient
      .from('inventory_adjustments')
      .select('*, warehouse:warehouses(*)')
      .order('count_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/adjustments', async (req: AuthRequest, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const adj = await inventoryService.createInventoryAdjustment(payload)
    res.status(201).json({ success: true, data: adj })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/adjustments/:id/post', async (req: Request, res: Response) => {
  try {
    const adj = await inventoryService.postInventoryAdjustment(req.params.id)
    res.json({ success: true, data: adj })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= SERIAL NUMBERS =============

router.get('/serial-numbers/product/:productId', async (req: Request, res: Response) => {
  try {
    const serials = await inventoryService.getSerialNumbersByProduct(req.params.productId)
    res.json({ success: true, data: serials })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/serial-numbers/:serialNumber', async (req: Request, res: Response) => {
  try {
    const serial = await inventoryService.getSerialNumberByNumber(req.params.serialNumber)
    res.json({ success: true, data: serial })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= WARRANTIES =============

router.post('/warranties', async (req: AuthRequest, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const warranty = await inventoryService.createWarranty(payload)
    res.status(201).json({ success: true, data: warranty })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/warranty-claims', async (req: AuthRequest, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const claim = await inventoryService.submitWarrantyClaim(payload)
    res.status(201).json({ success: true, data: claim })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= STOCK LEVELS & METRICS =============

router.get('/stock-levels', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
    const { data, error } = await supabaseClient
      .from('stock_levels')
      .select('*, product:products(*), warehouse:warehouses(*)')
      .limit(limit)

    if (error) throw error
    res.json({ success: true, data: data || [] })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/stock-levels/warehouse/:warehouseId', async (req: Request, res: Response) => {
  try {
    const stocks = await inventoryService.getStockLevelsByWarehouse(req.params.warehouseId)
    res.json({ success: true, data: stocks })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/low-stock', async (req: Request, res: Response) => {
  try {
    const warehouseId = req.query.warehouseId as string
    const items = await inventoryService.getLowStockItems(warehouseId)
    res.json({ success: true, data: items })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
