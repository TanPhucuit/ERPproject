import { Router, Response } from 'express'
import { AuthRequest, authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { productService } from '../services/productService'

const router = Router()

// Get all products
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const skip = Math.max(0, parseInt(req.query.skip as string) || 0)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50)
    const search = req.query.search as string

    const { data, total } = await productService.getAllProducts(skip, limit, search)

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

// Get single product
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await productService.getProductById(req.params.id)
    res.json({ success: true, data: product })
  })
)

// Get product categories
router.get(
  '/categories/all',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const categories = await productService.getProductCategories()
    res.json({ success: true, data: categories })
  })
)

// Create product
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await productService.createProduct(req.body)
    res.status(201).json({ success: true, data: product })
  })
)

// Update product
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await productService.updateProduct(req.params.id, req.body)
    res.json({ success: true, data: product })
  })
)

// Delete product
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await productService.deleteProduct(req.params.id)
    res.json({ success: true, message: 'Product deleted' })
  })
)

export default router
