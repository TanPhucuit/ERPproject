import express, { Request, Response } from 'express'
import { purchaseService } from '../services/purchaseService'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)

// ============= RFQs (REQUEST FOR QUOTATION) =============

router.get('/rfqs', async (req: Request, res: Response) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const status = req.query.status as string

    const rfqs = await purchaseService.getAllRFQs(skip, limit, status)
    res.json({ success: true, data: rfqs })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/rfqs/:id', async (req: Request, res: Response) => {
  try {
    const rfq = await purchaseService.getRFQById(req.params.id)
    res.json({ success: true, data: rfq })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/rfqs', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const rfq = await purchaseService.createRFQ(payload)
    res.status(201).json({ success: true, data: rfq })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/rfqs/:id/submit', async (req: Request, res: Response) => {
  try {
    const { supplierIds } = req.body
    const result = await purchaseService.submitRFQToSuppliers(req.params.id, supplierIds)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/rfqs/:id', async (req: Request, res: Response) => {
  try {
    const rfq = await purchaseService.updateRFQ(req.params.id, req.body)
    res.json({ success: true, data: rfq })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.delete('/rfqs/:id', async (req: Request, res: Response) => {
  try {
    await purchaseService.deleteRFQ(req.params.id)
    res.json({ success: true, message: 'RFQ deleted' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= SUPPLIER QUOTES =============

router.post('/rfq-lines/:rfqLineId/quotes', async (req: Request, res: Response) => {
  try {
    const { supplierId, quotedPrice, leadTime } = req.body
    const quote = await purchaseService.receiveSupplierQuote(req.params.rfqLineId, supplierId, quotedPrice, leadTime)
    res.status(201).json({ success: true, data: quote })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/rfq-lines/:rfqLineId/quotes', async (req: Request, res: Response) => {
  try {
    const quotes = await purchaseService.compareSupplierQuotes(req.params.rfqLineId)
    res.json({ success: true, data: quotes })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/rfq-lines/:rfqLineId/select-supplier', async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.body
    const result = await purchaseService.selectSupplierForRFQLine(req.params.rfqLineId, supplierId)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= PURCHASE ORDERS =============

router.get('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const status = req.query.status as string

    const pos = await purchaseService.getAllPurchaseOrders(skip, limit, status)
    res.json({ success: true, data: pos })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    const po = await purchaseService.getPurchaseOrderById(req.params.id)
    res.json({ success: true, data: po })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const po = await purchaseService.createPurchaseOrder(payload)
    res.status(201).json({ success: true, data: po })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    const po = await purchaseService.updatePurchaseOrder(req.params.id, req.body)
    res.json({ success: true, data: po })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.delete('/purchase-orders/:id', async (req: Request, res: Response) => {
  try {
    await purchaseService.deletePurchaseOrder(req.params.id)
    res.json({ success: true, message: 'Purchase order deleted' })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/purchase-orders/:id/confirm', async (req: Request, res: Response) => {
  try {
    const po = await purchaseService.confirmPurchaseOrder(req.params.id, req.user?.id || req.user?.userId || 'demo-user')
    res.json({ success: true, data: po })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/purchase-orders/:id/record-receipt', async (req: Request, res: Response) => {
  try {
    const { partialQuantities } = req.body
    const result = await purchaseService.recordPOReceipt(req.params.id, partialQuantities)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= METRICS & ANALYTICS =============

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0]

    const metrics = await purchaseService.getPurchaseMetrics(startDate, endDate)
    res.json({ success: true, data: metrics })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/top-suppliers', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const suppliers = await purchaseService.getTopSuppliers(limit)
    res.json({ success: true, data: suppliers })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
