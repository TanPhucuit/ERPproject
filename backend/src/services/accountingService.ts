import { supabase } from '../config/supabase'

export const accountingService = {
  // ============= INVOICES =============

  async getAllCustomerInvoices(skip: number = 0, limit: number = 50, status?: string) {
    let query = supabase
      .from('customer_invoices')
      .select('*, customer:customers(name), sales_order:sales_orders(sales_order_number)', {
        count: 'exact',
      })
      .order('invoice_date', { ascending: false })
      .range(skip, skip + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.eq('is_deleted', false)

    const { data, count, error } = await query

    if (error) throw new Error(`Failed to fetch invoices: ${error.message}`)

    return { data: data || [], total: count || 0 }
  },

  async getCustomerInvoiceById(id: string) {
    const { data, error } = await supabase
      .from('customer_invoices')
      .select('*, customer:customers(*), lines:customer_invoice_lines(*)')
      .eq('id', id)
      .single()

    if (error) throw new Error(`Failed to fetch invoice: ${error.message}`)
    return data
  },

  async createCustomerInvoice(payload: any) {
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('customer_invoices')
      .insert([payload])
      .select()
      .single()

    if (invoiceError) throw new Error(`Failed to create invoice: ${invoiceError.message}`)

    // Create invoice lines
    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any) => ({
        ...line,
        invoice_id: invoice.id,
      }))

      const { error: linesError } = await supabase.from('customer_invoice_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create invoice lines: ${linesError.message}`)
    }

    return invoice
  },

  async updateCustomerInvoice(id: string, payload: any) {
    const { data, error } = await supabase
      .from('customer_invoices')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update invoice: ${error.message}`)
    return data
  },

  // ============= VENDOR BILLS =============

  async getAllVendorBills(skip: number = 0, limit: number = 50, status?: string) {
    let query = supabase
      .from('vendor_bills')
      .select('*, supplier:suppliers(name), purchase_order:purchase_orders(purchase_order_number)', {
        count: 'exact',
      })
      .order('bill_date', { ascending: false })
      .range(skip, skip + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.eq('is_deleted', false)

    const { data, count, error } = await query

    if (error) throw new Error(`Failed to fetch bills: ${error.message}`)

    return { data: data || [], total: count || 0 }
  },

  async getVendorBillById(id: string) {
    const { data, error } = await supabase
      .from('vendor_bills')
      .select('*, supplier:suppliers(*), lines:vendor_bill_lines(*)')
      .eq('id', id)
      .single()

    if (error) throw new Error(`Failed to fetch bill: ${error.message}`)
    return data
  },

  async createVendorBill(payload: any) {
    const { data: bill, error: billError } = await supabase
      .from('vendor_bills')
      .insert([payload])
      .select()
      .single()

    if (billError) throw new Error(`Failed to create bill: ${billError.message}`)

    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any) => ({
        ...line,
        bill_id: bill.id,
      }))

      const { error: linesError } = await supabase.from('vendor_bill_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create bill lines: ${linesError.message}`)
    }

    return bill
  },

  // ============= CREDIT NOTES =============

  async createCreditNote(payload: any) {
    const { data: note, error: noteError } = await supabase
      .from('credit_notes')
      .insert([payload])
      .select()
      .single()

    if (noteError) throw new Error(`Failed to create credit note: ${noteError.message}`)

    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any) => ({
        ...line,
        credit_note_id: note.id,
      }))

      const { error: linesError } = await supabase.from('credit_note_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create credit note lines: ${linesError.message}`)
    }

    // Update invoice outstanding amount
    const { data: invoice } = await supabase
      .from('customer_invoices')
      .select('*')
      .eq('id', payload.invoice_id)
      .single()

    if (invoice) {
      const newOutstanding = invoice.outstanding_amount - payload.total_amount
      await supabase
        .from('customer_invoices')
        .update({ outstanding_amount: Math.max(0, newOutstanding) })
        .eq('id', payload.invoice_id)
    }

    return note
  },

  async getAllCreditNotes(skip: number = 0, limit: number = 50) {
    const { data, count, error } = await supabase
      .from('credit_notes')
      .select('*, customer:customers(name), invoice:customer_invoices(invoice_number)', {
        count: 'exact',
      })
      .order('credit_date', { ascending: false })
      .range(skip, skip + limit - 1)
      .eq('is_deleted', false)

    if (error) throw new Error(`Failed to fetch credit notes: ${error.message}`)

    return { data: data || [], total: count || 0 }
  },

  // ============= DEBIT NOTES =============

  async createDebitNote(payload: any) {
    const { data: note, error: noteError } = await supabase
      .from('debit_notes')
      .insert([payload])
      .select()
      .single()

    if (noteError) throw new Error(`Failed to create debit note: ${noteError.message}`)

    if (payload.lines && payload.lines.length > 0) {
      const lines = payload.lines.map((line: any) => ({
        ...line,
        debit_note_id: note.id,
      }))

      const { error: linesError } = await supabase.from('debit_note_lines').insert(lines)

      if (linesError) throw new Error(`Failed to create debit note lines: ${linesError.message}`)
    }

    return note
  },

  async getAllDebitNotes(skip: number = 0, limit: number = 50) {
    const { data, count, error } = await supabase
      .from('debit_notes')
      .select('*, supplier:suppliers(name), bill:vendor_bills(bill_number)', {
        count: 'exact',
      })
      .order('debit_date', { ascending: false })
      .range(skip, skip + limit - 1)
      .eq('is_deleted', false)

    if (error) throw new Error(`Failed to fetch debit notes: ${error.message}`)

    return { data: data || [], total: count || 0 }
  },

  // ============= PAYMENTS =============

  async recordCustomerPayment(payload: any) {
    const { data: payment, error: paymentError } = await supabase
      .from('customer_payments')
      .insert([payload])
      .select()
      .single()

    if (paymentError) throw new Error(`Failed to record payment: ${paymentError.message}`)

    // Update invoice paid amount
    const { data: invoice } = await supabase
      .from('customer_invoices')
      .select('*')
      .eq('id', payload.invoice_id)
      .single()

    if (invoice) {
      const newPaidAmount = (invoice.paid_amount || 0) + payload.amount
      await supabase
        .from('customer_invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newPaidAmount >= invoice.total_amount ? 'paid' : 'partial_paid',
        })
        .eq('id', payload.invoice_id)
    }

    return payment
  },

  async getOutstandingInvoices(customerId: string) {
    const { data, error } = await supabase
      .from('customer_invoices')
      .select('*')
      .eq('customer_id', customerId)
      .or('status.eq.pending,status.eq.partial_paid,status.eq.overdue')
      .eq('is_deleted', false)

    if (error) throw new Error(`Failed to fetch outstanding invoices: ${error.message}`)

    return data || []
  },

  // ============= ACCOUNTING METRICS =============

  async getAccountingMetrics(startDate: string, endDate: string) {
    // Total invoices issued
    const { count: totalInvoices } = await supabase
      .from('customer_invoices')
      .select('*', { count: 'exact' })
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .eq('is_deleted', false)

    // Total outstanding
    const { data: outstandingData } = await supabase
      .from('customer_invoices')
      .select('outstanding_amount')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .in('status', ['pending', 'partial_paid', 'overdue'])

    const totalOutstanding = outstandingData?.reduce((sum, inv) => sum + (inv.outstanding_amount || 0), 0) || 0

    // Total received
    const { data: paidData } = await supabase
      .from('customer_invoices')
      .select('paid_amount')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)

    const totalReceived = paidData?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0

    return {
      totalInvoices,
      totalOutstanding,
      totalReceived,
      totalBills: 0, // To fetch from vendor_bills
      totalPayable: 0,
    }
  },
}
