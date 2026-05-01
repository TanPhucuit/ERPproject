import express, { Request, Response } from 'express'
import { accountingService } from '../services/accountingService'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)

// ============= CUSTOMER INVOICES =============

router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const status = req.query.status as string

    const invoices = await accountingService.getAllCustomerInvoices(skip, limit, status)
    res.json({ success: true, data: invoices })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await accountingService.getCustomerInvoiceById(req.params.id)
    res.json({ success: true, data: invoice })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const invoice = await accountingService.createCustomerInvoice(payload)
    res.status(201).json({ success: true, data: invoice })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await accountingService.updateCustomerInvoice(req.params.id, req.body)
    res.json({ success: true, data: invoice })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= VENDOR BILLS =============

router.get('/bills', async (req: Request, res: Response) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const status = req.query.status as string

    const bills = await accountingService.getAllVendorBills(skip, limit, status)
    res.json({ success: true, data: bills })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/bills/:id', async (req: Request, res: Response) => {
  try {
    const bill = await accountingService.getVendorBillById(req.params.id)
    res.json({ success: true, data: bill })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/bills', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const bill = await accountingService.createVendorBill(payload)
    res.status(201).json({ success: true, data: bill })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= CREDIT NOTES =============

router.post('/credit-notes', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const creditNote = await accountingService.createCreditNote(payload)
    res.status(201).json({ success: true, data: creditNote })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/credit-notes', async (req: Request, res: Response) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

    const creditNotes = await accountingService.getAllCreditNotes(skip, limit)
    res.json({ success: true, data: creditNotes })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= DEBIT NOTES =============

router.post('/debit-notes', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const debitNote = await accountingService.createDebitNote(payload)
    res.status(201).json({ success: true, data: debitNote })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/debit-notes', async (req: Request, res: Response) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

    const debitNotes = await accountingService.getAllDebitNotes(skip, limit)
    res.json({ success: true, data: debitNotes })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= PAYMENTS =============

router.post('/payments', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      received_by_id: req.user?.id,
    }
    const payment = await accountingService.recordCustomerPayment(payload)
    res.status(201).json({ success: true, data: payment })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/outstanding-invoices/:customerId', async (req: Request, res: Response) => {
  try {
    const invoices = await accountingService.getOutstandingInvoices(req.params.customerId)
    res.json({ success: true, data: invoices })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= METRICS & REPORTING =============

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0]

    const metrics = await accountingService.getAccountingMetrics(startDate, endDate)
    res.json({ success: true, data: metrics })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
