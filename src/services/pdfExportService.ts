interface InvoiceData {
  id?: string
  invoice_number?: string
  invoiceNumber?: string
  customer?: { name: string }
  customer_name?: string
  customerName?: string
  total_amount?: number
  totalAmount?: number
  net_amount?: number
  subtotal?: number
  tax_amount?: number
  taxAmount?: number
  amount?: number
  adjustmentAmount?: number
  adjustmentReason?: string
  amountDue?: number
  invoice_date?: string
  invoiceDate?: string
  date?: string
  due_date?: string
  dueDate?: string
  created_at?: string
  status?: string
  items?: any[]
  lines?: any[]
  notes?: string
  payment_terms?: string
}

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} VND`

export const exportInvoiceToPDF = (invoice: InvoiceData) => {
  const invoiceNumber = invoice.invoice_number || invoice.invoiceNumber || 'INV-000'
  const customerName = invoice.customer?.name || invoice.customer_name || invoice.customerName || 'Customer'
  const lines = invoice.items?.length ? invoice.items : invoice.lines || []
  const subtotal = invoice.net_amount || invoice.subtotal || lines.reduce(
    (sum, item) => sum + (item.line_total || item.total || (item.unit_price || 0) * (item.quantity || 1)),
    0
  )
  const storedTaxAmount = invoice.tax_amount || invoice.taxAmount || 0
  const taxAmount = storedTaxAmount > 0 ? storedTaxAmount : Math.round(subtotal * 0.1)
  const creditAmount = invoice.adjustmentAmount || 0
  const totalBeforeCredit = subtotal + taxAmount
  const totalAmount = invoice.amountDue ?? Math.max(totalBeforeCredit - creditAmount, 0)
  const invoiceDate = invoice.invoice_date || invoice.invoiceDate || invoice.created_at?.split('T')[0] || invoice.date || new Date().toISOString().split('T')[0]
  const dueDate = invoice.due_date || invoice.dueDate || ''

  const rows = lines.length > 0
    ? lines.map((item) => `
      <tr>
        <td>${item.description || item.product_name || item.product_sku || 'Item'}</td>
        <td class="right">${item.quantity || 1}</td>
        <td class="right">${money(item.unit_price || 0)}</td>
        <td class="right">${money(item.line_total || item.total || (item.unit_price || 0) * (item.quantity || 1))}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="empty">No line items</td></tr>'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoiceNumber}</title>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; margin: 20px; color: #111827; }
        .invoice-container { max-width: 820px; margin: 0 auto; padding: 32px; border: 1px solid #d1d5db; }
        .header { text-align: center; margin-bottom: 28px; border-bottom: 3px solid #2563eb; padding-bottom: 14px; }
        .header h1 { margin: 0 0 8px; color: #2563eb; font-size: 30px; letter-spacing: 0; }
        .company { color: #4b5563; font-size: 12px; }
        .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 24px; }
        h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; }
        p { margin: 5px 0; font-size: 12px; color: #374151; }
        strong { color: #111827; }
        table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        th { padding: 10px; text-align: left; border-bottom: 2px solid #111827; font-size: 12px; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        .right { text-align: right; }
        .empty { text-align: center; color: #6b7280; }
        .summary { margin-left: auto; width: 320px; font-size: 12px; }
        .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .credit { color: #047857; }
        .total { margin-top: 8px; padding-top: 10px; border-top: 2px solid #111827; font-weight: 700; font-size: 14px; }
        .notes { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; }
        .footer { margin-top: 36px; text-align: center; color: #6b7280; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
        @media print { body { margin: 0; } .invoice-container { border: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>INVOICE</h1>
          <div class="company">NovaTech Distribution - SmartHome & IoT Solutions</div>
        </div>
        <div class="invoice-info">
          <div>
            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${invoiceDate}</p>
            <p><strong>Due Date:</strong> ${dueDate || '-'}</p>
            <p><strong>Status:</strong> ${(invoice.status || 'sent').toUpperCase()}</p>
          </div>
          <div>
            <h3>Bill To</h3>
            <p><strong>${customerName}</strong></p>
            <p>Vietnam</p>
            ${invoice.payment_terms ? `<p><strong>Terms:</strong> ${invoice.payment_terms}</p>` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="right">Quantity</th>
              <th class="right">Unit Price</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="summary">
          <div class="summary-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
          <div class="summary-row"><span>Tax 10%</span><strong>${money(taxAmount)}</strong></div>
          ${creditAmount > 0 ? `<div class="summary-row credit"><span>Credit Note${invoice.adjustmentReason ? ` (${invoice.adjustmentReason})` : ''}</span><strong>-${money(creditAmount)}</strong></div>` : ''}
          <div class="summary-row total"><span>Total Amount</span><strong>${money(totalAmount)}</strong></div>
        </div>
        ${invoice.notes ? `<div class="notes"><strong>Notes:</strong><p>${invoice.notes.replace(/\n/g, '<br>')}</p></div>` : ''}
        <div class="footer">
          <p>Thank you for your business.</p>
          <p>Generated on ${new Date().toLocaleString('vi-VN')}</p>
        </div>
      </div>
    </body>
    </html>
  `

  const printWindow = window.open('', '', 'height=800,width=1000')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
  } else {
    alert('Please disable popup blockers to print/download invoice')
  }
}

export const exportMultipleInvoicesToPDF = (invoices: InvoiceData[]) => {
  invoices.forEach(exportInvoiceToPDF)
}
