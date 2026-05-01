import { supabase } from '../config/supabase'

export const crmService = {
  // ============= LEADS =============

  async getAllLeads(skip: number = 0, limit: number = 50, stage?: string) {
    let query = supabase
      .from('leads')
      .select(
        '*, stage_info:lead_stages(name), owner_info:users(full_name, email), activities:activities(count)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1)

    if (stage) {
      query = query.eq('stage_id', stage)
    }

    query = query.eq('is_deleted', false)

    const { data, count, error } = await query

    if (error) throw new Error(`Failed to fetch leads: ${error.message}`)

    return { data: data || [], total: count || 0 }
  },

  async getLeadById(id: string) {
    const { data, error } = await supabase
      .from('leads')
      .select('*, stage_info:lead_stages(*), owner_info:users(*), activities:activities(*)')
      .eq('id', id)
      .single()

    if (error) throw new Error(`Failed to fetch lead: ${error.message}`)
    return data
  },

  async createLead(payload: any) {
    const { data, error } = await supabase
      .from('leads')
      .insert([payload])
      .select()
      .single()

    if (error) throw new Error(`Failed to create lead: ${error.message}`)
    return data
  },

  async updateLead(id: string, payload: any) {
    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update lead: ${error.message}`)
    return data
  },

  async changeLeadStage(leadId: string, stageId: string) {
    const { data, error } = await supabase
      .from('leads')
      .update({ stage_id: stageId, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .select()
      .single()

    if (error) throw new Error(`Failed to change lead stage: ${error.message}`)
    return data
  },

  // ============= ACTIVITIES =============

  async createActivity(payload: any) {
    const { data, error } = await supabase
      .from('activities')
      .insert([payload])
      .select()
      .single()

    if (error) throw new Error(`Failed to create activity: ${error.message}`)
    return data
  },

  async getActivitiesForLead(leadId: string) {
    const { data, error } = await supabase
      .from('activities')
      .select('*, type_info:activity_types(*), assigned_to:users(full_name, email)')
      .eq('lead_id', leadId)
      .order('scheduled_date', { ascending: false })

    if (error) throw new Error(`Failed to fetch activities: ${error.message}`)
    return data || []
  },

  async updateActivity(id: string, payload: any) {
    const { data, error } = await supabase.from('activities').update(payload).eq('id', id).select().single()

    if (error) throw new Error(`Failed to update activity: ${error.message}`)
    return data
  },

  async completeActivity(id: string, outcome: string) {
    const { data, error } = await supabase
      .from('activities')
      .update({
        status: 'done',
        actual_date: new Date().toISOString(),
        outcome,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to complete activity: ${error.message}`)
    return data
  },

  // ============= LEAD STAGES & PIPELINE =============

  async getLeadStages() {
    const { data, error } = await supabase.from('lead_stages').select('*').order('display_order')

    if (error) throw new Error(`Failed to fetch lead stages: ${error.message}`)
    return data || []
  },

  async getLeadsPipelineSummary() {
    const { data: stages, error: stagesError } = await supabase
      .from('lead_stages')
      .select('*')
      .order('display_order')

    if (stagesError) throw new Error(`Failed to fetch stages: ${stagesError.message}`)

    const pipeline = []

    for (const stage of stages) {
      const { data: leadsInStage, error: leadsError } = await supabase
        .from('leads')
        .select('id, estimated_value')
        .eq('stage_id', stage.id)
        .eq('is_deleted', false)

      if (leadsError) throw new Error(`Failed to fetch leads for stage: ${leadsError.message}`)

      const totalValue = leadsInStage?.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0) || 0
      const count = leadsInStage?.length || 0

      pipeline.push({
        stage: stage.name,
        count,
        totalValue,
        probability: stage.probability_percent,
      })
    }

    return pipeline
  },

  // ============= CRM ANALYTICS =============

  async getLeadMetrics(period: 'week' | 'month' | 'quarter'): Promise<any> {
    let daysBack = 7
    if (period === 'month') daysBack = 30
    if (period === 'quarter') daysBack = 90

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // New leads created
    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .eq('is_deleted', false)

    // Leads converted to customers
    const { data: convertedLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('stage_id', (await this.getLeadStages()).find((s: any) => s.name === 'won')?.id)
      .gte('updated_at', startDate.toISOString())
      .eq('is_deleted', false)

    // Total pipeline value
    const { data: allLeads } = await supabase
      .from('leads')
      .select('estimated_value')
      .eq('is_deleted', false)

    const totalPipelineValue = allLeads?.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0) || 0

    return {
      newLeadsCreated: newLeads || 0,
      leadsConverted: convertedLeads?.length || 0,
      totalPipelineValue,
      conversionRate: newLeads ? ((convertedLeads?.length || 0) / (newLeads || 1)) * 100 : 0,
    }
  },
}
