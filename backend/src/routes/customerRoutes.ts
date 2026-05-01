import { Router, Response } from 'express'
import { AuthRequest, authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { customerService } from '../services/customerService'

const router = Router()

// Get all customers
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const skip = Math.max(0, parseInt(req.query.skip as string) || 0)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50)
    const search = req.query.search as string

    const { data, total } = await customerService.getAllCustomers(skip, limit, search)

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

// Get single customer
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const customer = await customerService.getCustomerById(req.params.id)
    res.json({ success: true, data: customer })
  })
)

// Create customer
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const customer = await customerService.createCustomer(req.body)
    res.status(201).json({ success: true, data: customer })
  })
)

// Update customer
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const customer = await customerService.updateCustomer(req.params.id, req.body)
    res.json({ success: true, data: customer })
  })
)

// Delete customer
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await customerService.deleteCustomer(req.params.id)
    res.json({ success: true, message: 'Customer deleted' })
  })
)

export default router
