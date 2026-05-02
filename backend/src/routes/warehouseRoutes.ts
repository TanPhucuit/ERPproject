import express, { Request, Response } from 'express'
import { warehouseService } from '../services/warehouseService'
import { AuthRequest, authMiddleware } from '../middleware/auth'

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)

// ============= WAREHOUSE MANAGEMENT =============

router.get('/warehouses', async (req: Request, res: Response) => {
  try {
    const warehouses = await warehouseService.getAllWarehouses()
    res.json({ success: true, data: warehouses })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/warehouses/:id', async (req: Request, res: Response) => {
  try {
    const warehouse = await warehouseService.getWarehouseById(req.params.id)
    res.json({ success: true, data: warehouse })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/warehouses/:id/capacity', async (req: Request, res: Response) => {
  try {
    const capacity = await warehouseService.getWarehouseCapacity(req.params.id)
    res.json({ success: true, data: capacity })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= BIN LOCATIONS =============

router.post('/bin-locations', async (req: Request, res: Response) => {
  try {
    const bin = await warehouseService.createBinLocation(req.body)
    res.status(201).json({ success: true, data: bin })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/warehouses/:warehouseId/bin-locations', async (req: Request, res: Response) => {
  try {
    const bins = await warehouseService.getBinLocationsByWarehouse(req.params.warehouseId)
    res.json({ success: true, data: bins })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/warehouses/:warehouseId/find-bin', async (req: Request, res: Response) => {
  try {
    const { productId, quantityNeeded } = req.query
    const bin = await warehouseService.findAvailableBin(
      req.params.warehouseId,
      productId as string,
      parseInt(quantityNeeded as string)
    )
    res.json({ success: true, data: bin })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/bin-locations/:id', async (req: Request, res: Response) => {
  try {
    const bin = await warehouseService.updateBinLocation(req.params.id, req.body)
    res.json({ success: true, data: bin })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= PUTAWAY TASKS =============

router.post('/putaway-tasks', async (req: AuthRequest, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const task = await warehouseService.createPutawayTask(payload)
    res.status(201).json({ success: true, data: task })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/putaway-tasks/user/:userId', async (req: Request, res: Response) => {
  try {
    const warehouseId = req.query.warehouseId as string
    const tasks = await warehouseService.getPutawayTasksForUser(req.params.userId, warehouseId)
    res.json({ success: true, data: tasks })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/putaway-tasks/:id/complete', async (req: Request, res: Response) => {
  try {
    const result = await warehouseService.completePutawayTask(req.params.id)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= PICKING TASKS =============

router.post('/picking-tasks', async (req: AuthRequest, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const task = await warehouseService.createPickingTask(payload)
    res.status(201).json({ success: true, data: task })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/picking-tasks/user/:userId', async (req: Request, res: Response) => {
  try {
    const warehouseId = req.query.warehouseId as string
    const tasks = await warehouseService.getPickingTasksForUser(req.params.userId, warehouseId)
    res.json({ success: true, data: tasks })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/picking-tasks/:id/complete', async (req: Request, res: Response) => {
  try {
    const result = await warehouseService.completePickingTask(req.params.id)
    res.json({ success: true, data: result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= STOCK TRANSFERS =============

router.post('/stock-transfers', async (req: AuthRequest, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const transfer = await warehouseService.createStockTransfer(payload)
    res.status(201).json({ success: true, data: transfer })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/stock-transfers/:id/confirm', async (req: Request, res: Response) => {
  try {
    const transfer = await warehouseService.confirmStockTransfer(req.params.id)
    res.json({ success: true, data: transfer })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= WAREHOUSE METRICS =============

router.get('/utilization', async (req: Request, res: Response) => {
  try {
    const warehouseId = req.query.warehouseId as string
    const utilization = await warehouseService.getWarehouseUtilization(warehouseId)
    res.json({ success: true, data: utilization })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/warehouses/:id/activity-log', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30
    const log = await warehouseService.getWarehouseActivityLog(req.params.id, days)
    res.json({ success: true, data: log })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/warehouses/:id/receiving-metrics', async (req: Request, res: Response) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0]

    const metrics = await warehouseService.getReceivingMetrics(req.params.id, startDate, endDate)
    res.json({ success: true, data: metrics })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/warehouses/:id/shipping-metrics', async (req: Request, res: Response) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0]

    const metrics = await warehouseService.getShippingMetrics(req.params.id, startDate, endDate)
    res.json({ success: true, data: metrics })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/task-completion-metrics', async (req: Request, res: Response) => {
  try {
    const warehouseId = req.query.warehouseId as string
    const userId = req.query.userId as string
    const metrics = await warehouseService.getTaskCompletionMetrics(warehouseId, userId)
    res.json({ success: true, data: metrics })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
