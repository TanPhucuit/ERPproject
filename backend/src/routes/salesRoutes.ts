import { Router, Response } from 'express'
import { AuthRequest, authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { salesService } from '../services/salesService'
import { supabaseClient } from '../config/supabase'

const router = Router()

// Quotations
router.get(
  '/quotations',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const skip = Math.max(0, parseInt(req.query.skip as string) || 0)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50)
    const { data, error } = await supabaseClient
      .from('quotations')
      .select('*, customer:customers(*)')
      .range(skip, skip + limit - 1)

    if (error) throw error
    res.json({ success: true, data: data || [] })
  })
)

router.post(
  '/quotations',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseClient.from('quotations').insert([req.body]).select().single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  })
)

router.put(
  '/quotations/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseClient.from('quotations').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, data })
  })
)

router.delete(
  '/quotations/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { error } = await supabaseClient.from('quotations').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Quotation deleted' })
  })
)

// Get all sales orders
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const skip = Math.max(0, parseInt(req.query.skip as string) || 0)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50)
    const status = req.query.status as string

    const { data, total } = await salesService.getAllSalesOrders(skip, limit, status)

    res.json({
      success: true,
      data,
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      pages: Math.ceil(total / limit),
    })
  })
)

// Get single sales order
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await salesService.getSalesOrderById(req.params.id)
    res.json({ success: true, data: order })
  })
)

// Create sales order
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await salesService.createSalesOrder(req.body)
    res.status(201).json({ success: true, data: order })
  })
)

// Update sales order
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await salesService.updateSalesOrder(req.params.id, req.body)
    res.json({ success: true, data: order })
  })
)

// Delete sales order
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await salesService.deleteSalesOrder(req.params.id)
    res.json({ success: true, message: 'Sales order deleted' })
  })
)

export default router
