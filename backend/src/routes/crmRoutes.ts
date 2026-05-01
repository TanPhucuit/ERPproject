import express, { Request, Response } from 'express'
import { crmService } from '../services/crmService'
import { authMiddleware } from '../middleware/auth'

const router = express.Router()

// Apply auth middleware to all routes
router.use(authMiddleware)

// ============= LEADS =============

router.get('/leads', async (req: Request, res: Response) => {
  try {
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const stage = req.query.stage as string

    const leads = await crmService.getAllLeads(skip, limit, stage)
    res.json({ success: true, data: leads })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/leads/:id', async (req: Request, res: Response) => {
  try {
    const lead = await crmService.getLeadById(req.params.id)
    res.json({ success: true, data: lead })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/leads', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const lead = await crmService.createLead(payload)
    res.status(201).json({ success: true, data: lead })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/leads/:id', async (req: Request, res: Response) => {
  try {
    const lead = await crmService.updateLead(req.params.id, req.body)
    res.json({ success: true, data: lead })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/leads/:id/stage', async (req: Request, res: Response) => {
  try {
    const { stageId } = req.body
    const lead = await crmService.changeLeadStage(req.params.id, stageId)
    res.json({ success: true, data: lead })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= ACTIVITIES =============

router.post('/activities', async (req: Request, res: Response) => {
  try {
    const payload = {
      ...req.body,
      created_by_id: req.user?.id,
    }
    const activity = await crmService.createActivity(payload)
    res.status(201).json({ success: true, data: activity })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/leads/:leadId/activities', async (req: Request, res: Response) => {
  try {
    const activities = await crmService.getActivitiesForLead(req.params.leadId)
    res.json({ success: true, data: activities })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/activities/:id', async (req: Request, res: Response) => {
  try {
    const activity = await crmService.updateActivity(req.params.id, req.body)
    res.json({ success: true, data: activity })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.put('/activities/:id/complete', async (req: Request, res: Response) => {
  try {
    const { outcome } = req.body
    const activity = await crmService.completeActivity(req.params.id, outcome)
    res.json({ success: true, data: activity })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= LEAD STAGES & PIPELINE =============

router.get('/lead-stages', async (req: Request, res: Response) => {
  try {
    const stages = await crmService.getLeadStages()
    res.json({ success: true, data: stages })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/pipeline', async (req: Request, res: Response) => {
  try {
    const pipeline = await crmService.getLeadsPipelineSummary()
    res.json({ success: true, data: pipeline })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= ANALYTICS & METRICS =============

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const period = ((req.query.period as string) || 'month') as 'week' | 'month' | 'quarter'
    const metrics = await crmService.getLeadMetrics(period)
    res.json({ success: true, data: metrics })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
