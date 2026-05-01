import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import 'express-async-errors'
import dotenv from 'dotenv'

import authRoutes from './routes/authRoutes'
import customerRoutes from './routes/customerRoutes'
import productRoutes from './routes/productRoutes'
import salesRoutes from './routes/salesRoutes'
import metricsRoutes from './routes/metricsRoutes'
import accountingRoutes from './routes/accountingRoutes'
import crmRoutes from './routes/crmRoutes'
import purchaseRoutes from './routes/purchaseRoutes'
import inventoryRoutes from './routes/inventoryRoutes'
import warehouseRoutes from './routes/warehouseRoutes'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean) as string[]

const app: Express = express()

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(null, true)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/products', productRoutes)
app.use('/api/sales-orders', salesRoutes)
app.use('/api/metrics', metricsRoutes)
app.use('/api/accounting', accountingRoutes)
app.use('/api/crm', crmRoutes)
app.use('/api/purchase', purchaseRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/warehouse', warehouseRoutes)

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  })
})

app.use(errorHandler)

export default app
