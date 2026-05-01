import { Router, Response } from 'express'
import { AuthRequest, authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { metricsService } from '../services/metricsService'

const router = Router()

// Get daily metrics
router.get(
  '/daily',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = Math.min(365, parseInt(req.query.days as string) || 30)
    const data = await metricsService.getDailyMetrics(days)
    res.json({ success: true, data })
  })
)

// Get product metrics
router.get(
  '/products',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await metricsService.getProductMetrics()
    res.json({ success: true, data })
  })
)

// Get customer metrics
router.get(
  '/customers',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await metricsService.getCustomerMetrics()
    res.json({ success: true, data })
  })
)

// Get supplier metrics
router.get(
  '/suppliers',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await metricsService.getSupplierMetrics()
    res.json({ success: true, data })
  })
)

export default router
