/**
 * PDF Export Service
 * Generates and downloads PDF documents for invoices
 * 
 * Current implementation uses HTML print method (works in all browsers)
 * For advanced PDF features with jsPDF, run: npm install jspdf jspdf-autotable
 */

interface InvoiceData {
  id?: string
  invoice_number?: string
  invoiceNumber?: string
  customer?: { name: string }
  customer_name?: string
  total_amount?: number
  amount?: number
  invoice_date?: string
  date?: string
  due_date?: string
  dueDate?: string
  created_at?: string
  status?: string
  items?: any[]
  lines?: any[]
  notes?: string
  tax_rate?: number
  discount_percent?: number
  payment_terms?: string
}

/**
 * Export single invoice to PDF using HTML print method
 */
export const exportInvoiceToPDF = (invoice: InvoiceData) => {
  const invoiceNumber = invoice.invoice_number || invoice.invoiceNumber || 'INV-000'
  const customerName = invoice.customer?.name || invoice.customer_name || 'Customer'
  const amount = invoice.total_amount || invoice.amount || 0
  const invoiceDate =
    invoice.invoice_date || invoice.created_at?.split('T')[0] || invoice.date || new Date().toISOString().split('T')[0]
  const dueDate = invoice.due_date || invoice.dueDate || ''

  // Create HTML content for printing
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoiceNumber}</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; margin: 20px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 15px; }
        .header h1 { color: #007bff; margin: 0 0 10px 0; font-size: 28px; }
        .header .company { color: #666; font-size: 12px; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 25px; }
        .info-block { flex: 1; }
        .info-block h3 { margin-top: 0; margin-bottom: 10px; color: #333; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .info-block p { margin: 5px 0; color: #666; font-size: 11px; }
        .info-block strong { display: inline-block; min-width: 80px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #333; font-size: 11px; font-weight: bold; }
        td { padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 11px; }
        .amount-right { text-align: right; }
        .summary-row { display: flex; justify-content: flex-end; margin-top: 15px; font-size: 11px; }
        .summary-item { display: flex; width: 250px; margin-bottom: 8px; }
        .summary-label { flex: 1; }
        .summary-value { width: 100px; text-align: right; font-weight: bold; }
        .total-amount { display: flex; width: 250px; margin-top: 15px; padding-top: 15px; border-top: 2px solid #333; font-size: 14px; font-weight: bold; }
        .total-amount .summary-value { font-size: 14px; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 15px; font-size: 10px; font-weight: bold; }
        .status-paid { background-color: #d4edda; color: #155724; }
        .status-pending { background-color: #fff3cd; color: #856404; }
        .status-overdue { background-color: #f8d7da; color: #721c24; }
        .notes-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; }
        .notes-section strong { display: block; margin-bottom: 8px; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; padding-top: 20px; border-top: 1px solid #ddd; }
        @media print { body { margin: 0; } .invoice-container { box-shadow: none; border: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>INVOICE</h1>
          <div class="company">NovaTech Distribution • SmartHome & IoT Solutions</div>
        </div>

        <div class="invoice-info">
          <div class="info-block">
            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${invoiceDate}</p>
            <p><strong>Due Date:</strong> ${dueDate}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${invoice.status || 'pending'}">${(invoice.status || 'pending').toUpperCase()}</span></p>
          </div>
          <div class="info-block">
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
              <th class="amount-right">Quantity</th>
              <th class="amount-right">Unit Price</th>
              <th class="amount-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              invoice.items && invoice.items.length > 0
                ? invoice.items
                    .map(
                      (item) => `
              <tr>
                <td>${item.description || item.product_name || 'Item'}</td>
                <td class="amount-right">${item.quantity || 1}</td>
                <td class="amount-right">₫${(item.unit_price || 0).toLocaleString('vi-VN')}</td>
                <td class="amount-right">₫${(item.total || (item.unit_price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')}</td>
              </tr>
            `
                    )
                    .join('')
                : invoice.lines && invoice.lines.length > 0
                  ? invoice.lines
                      .map(
                        (item) => `
              <tr>
                <td>${item.description || item.product_name || 'Item'}</td>
                <td class="amount-right">${item.quantity || 1}</td>
                <td class="amount-right">₫${(item.unit_price || 0).toLocaleString('vi-VN')}</td>
                <td class="amount-right">₫${(item.total || (item.unit_price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')}</td>
              </tr>
            `
                      )
                      .join('')
                  : `
              <tr>
                <td colspan="4" style="text-align: center; color: #999;">No line items</td>
              </tr>
            `
            }
          </tbody>
        </table>

        <div class="summary-row">
          <div>
            ${invoice.discount_percent ? `<div class="summary-item"><div class="summary-label">Discount (${invoice.discount_percent}%):</div><div class="summary-value">-₫${(amount * (invoice.discount_percent / 100)).toLocaleString('vi-VN')}</div></div>` : ''}
            ${invoice.tax_rate ? `<div class="summary-item"><div class="summary-label">Tax (${invoice.tax_rate}%):</div><div class="summary-value">+₫${(amount * (invoice.tax_rate / 100)).toLocaleString('vi-VN')}</div></div>` : ''}
            <div class="total-amount"><div class="summary-label">Total Amount:</div><div class="summary-value">₫${amount.toLocaleString('vi-VN')}</div></div>
          </div>
        </div>

        ${invoice.notes ? `<div class="notes-section"><strong>Notes:</strong><p>${invoice.notes.replace(/\n/g, '<br>')}</p></div>` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${new Date().toLocaleString('vi-VN')}</p>
          <p style="margin-top: 10px; font-size: 9px;">NovaTech Distribution - SmartHome & IoT Solutions</p>
        </div>
      </div>
    </body>
    </html>
  `

  // Open print dialog with HTML content
  const printWindow = window.open('', '', 'height=800,width=1000')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  } else {
    alert('Please disable popup blockers to print/download invoice')
  }
}

/**
 * Export multiple invoices to PDF
 */
export const exportMultipleInvoicesToPDF = (invoices: InvoiceData[]) => {
  if (!invoices || invoices.length === 0) {
    alert('No invoices to export')
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoices Batch Export</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; font-size: 11px; color: #333; }
        .page-break { page-break-after: always; margin: 20px; padding: 20px; border: 1px solid #ddd; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .header h2 { color: #007bff; margin: 0; font-size: 16px; }
        .company { color: #666; font-size: 9px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .info-col { flex: 1; }
        .info-col strong { display: block; font-size: 9px; }
        .amount-right { text-align: right; }
        @media print { .page-break { page-break-after: always; margin: 0; border: none; } }
      </style>
    </head>
    <body>
      ${invoices
        .map(
          (invoice) => `
        <div class="page-break">
          <div class="header">
            <h2>INVOICE ${invoice.invoice_number || invoice.invoiceNumber || 'N/A'}</h2>
            <div class="company">NovaTech Distribution</div>
          </div>
          <div class="info-row">
            <div class="info-col">
              <strong>Date:</strong> ${invoice.invoice_date || invoice.created_at?.split('T')[0] || invoice.date || new Date().toISOString().split('T')[0]}
              <strong>Due:</strong> ${invoice.due_date || invoice.dueDate || 'N/A'}
            </div>
            <div class="info-col amount-right">
              <strong>Customer:</strong> ${invoice.customer?.name || invoice.customer_name || 'Customer'}
              <strong>Total:</strong> ₫${(invoice.total_amount || invoice.amount || 0).toLocaleString('vi-VN')}
            </div>
          </div>
          <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #ddd; font-size: 9px;">
            Status: <strong>${invoice.status || 'pending'}</strong>
          </div>
        </div>
      `
        )
        .join('')}
    </body>
    </html>
  `

  const printWindow = window.open('', '', 'height=800,width=1000')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  } else {
    alert('Please disable popup blockers to print/download invoices')
  }
}

