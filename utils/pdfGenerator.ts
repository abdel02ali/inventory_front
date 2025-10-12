// utils/pdfGeneratorExpo.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const generateInvoicePDFExpo = async (invoiceData: any) => {
  try {
    const htmlContent = generateInvoiceHTML(invoiceData);
    
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Share the PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${invoiceData.invoiceId}`,
      });
    }

    return uri;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

// For text sharing, use this alternative approach
export const shareInvoiceAsText = async (invoiceData: any) => {
  try {
    const formatCurrency = (amount: number) => `$${amount?.toFixed(2) || '0.00'}`;
    
    const textContent = `
INVOICE: ${invoiceData.invoiceId || invoiceData.id}
DATE: ${invoiceData.date}
CLIENT: ${invoiceData.clientName}
STATUS: ${invoiceData.paid ? 'PAID' : 'NOT PAID'}

ITEMS:
${(invoiceData.products || []).map((p: any) => 
  `• ${p.name} - ${p.quantity} x ${formatCurrency(p.unitPrice || p.price)} = ${formatCurrency((p.unitPrice || p.price) * p.quantity)}`
).join('\n')}

SUBTOTAL: ${formatCurrency(invoiceData.total)}
${invoiceData.remise > 0 ? `DISCOUNT: -${formatCurrency(invoiceData.remise)}\n` : ''}
${invoiceData.advance > 0 ? `ADVANCE: -${formatCurrency(invoiceData.advance)}\n` : ''}
AMOUNT DUE: ${formatCurrency(invoiceData.rest)}

Thank you for your business!
    `.trim();

    // Create a temporary file for sharing
    const htmlContent = `
      <html>
        <body>
          <pre style="font-family: Arial, sans-serif; font-size: 14px; white-space: pre-wrap;">${textContent}</pre>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'text/plain',
        dialogTitle: `Invoice ${invoiceData.invoiceId} - Text Summary`,
      });
    }

  } catch (error) {
    console.error('Text export error:', error);
    throw error;
  }
};

// Alternative: Simple alert-based text sharing (no file)
export const showInvoiceAsText = (invoiceData: any) => {
  const formatCurrency = (amount: number) => `$${amount?.toFixed(2) || '0.00'}`;
  
  const textContent = `
INVOICE: ${invoiceData.invoiceId || invoiceData.id}
DATE: ${invoiceData.date}
CLIENT: ${invoiceData.clientName}
STATUS: ${invoiceData.paid ? 'PAID' : 'NOT PAID'}

ITEMS:
${(invoiceData.products || []).map((p: any) => 
  `• ${p.name} - ${p.quantity} x ${formatCurrency(p.unitPrice || p.price)} = ${formatCurrency((p.unitPrice || p.price) * p.quantity)}`
).join('\n')}

SUBTOTAL: ${formatCurrency(invoiceData.total)}
${invoiceData.remise > 0 ? `DISCOUNT: -${formatCurrency(invoiceData.remise)}\n` : ''}
${invoiceData.advance > 0 ? `ADVANCE: -${formatCurrency(invoiceData.advance)}\n` : ''}
AMOUNT DUE: ${formatCurrency(invoiceData.rest)}
  `.trim();

  return textContent;
};

const generateInvoiceHTML = (invoice: any) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      // Handle both ISO format and dd/mm/yyyy format
      if (dateString.includes('/')) {
        return dateString; // Already in dd/mm/yyyy format
      }
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount?.toFixed(2) || '0.00'} MAD`;
  };

  // Calculate totals if not provided
  const subtotal = invoice.total || invoice.products?.reduce((sum: number, product: any) => {
    const price = product.unitPrice || product.price || 0;
    return sum + (price * product.quantity);
  }, 0) || 0;

  const remise = invoice.remise || 0;
  const advance = invoice.advance || 0;
  const totalAfterDiscount = subtotal - remise;
  const rest = Math.max(0, totalAfterDiscount - advance);
  const paid = invoice.paid || rest === 0;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.invoiceId || invoice.id}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 30px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #1e293b;
            font-size: 28px;
        }
        .header h2 {
            margin: 5px 0 0 0;
            color: #3b82f6;
            font-size: 18px;
        }
        .company-info {
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 8px;
        }
        .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .info-section {
            flex: 1;
            min-width: 200px;
            margin: 10px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h3 {
            color: #1e293b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        .table th {
            background-color: #3b82f6;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
        }
        .table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        .table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .table tr:hover {
            background-color: #f1f5f9;
        }
        .totals {
            margin-top: 30px;
            margin-left: auto;
            width: 300px;
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 6px 0;
        }
        .final-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #3b82f6;
            margin-top: 12px;
            padding-top: 12px;
            color: #1e293b;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
        }
        .status-paid {
            background-color: #10b981;
        }
        .status-not-paid {
            background-color: #ef4444;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
        .note {
            margin-top: 20px;
            padding: 15px;
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
        }
        @media print {
            body { padding: 15px; }
            .totals { width: 250px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>COMMERCIAL INVOICE</h1>
        <h2>${invoice.invoiceId || invoice.id || 'N/A'}</h2>
    </div>

    <div class="invoice-info">
        <div class="info-section">
            <div class="company-info">
                <h3>Mohamed El Hichou</h3>
                
                <p>KSAR SGHIR</p>
                <p>Phone: +212602085635</p>
                
            </div>
        </div>
        
        <div class="info-section">
            <div class="section">
                <p><strong>Invoice Date:</strong> ${formatDate(invoice.date)}</p>
                <p><strong>Status:</strong> 
                    <span class="status-badge ${paid ? 'status-paid' : 'status-not-paid'}">
                        ${paid ? 'PAID' : 'NOT PAID'}
                    </span>
                </p>
                <p><strong>Due Date:</strong> ${formatDate(invoice.date)}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>Bill To:</h3>
        <p><strong>${invoice.clientName || 'N/A'}</strong></p>
        <p>Client ID: ${invoice.clientId || 'N/A'}</p>
    </div>

    <div class="section">
        <h3>Products & Services</h3>
        <table class="table">
            <thead>
                <tr>
                    <th style="width: 50%;">Description</th>
                    <th style="width: 15%; text-align: center;">Qty</th>
                    <th style="width: 20%; text-align: right;">Unit Price</th>
                    <th style="width: 15%; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${(invoice.products || []).map((product: any) => `
                    <tr>
                        <td>${product.name || 'Unnamed Product'}</td>
                        <td style="text-align: center;">${product.quantity || 0}</td>
                        <td style="text-align: right;">${formatCurrency(product.unitPrice || product.price || 0)}</td>
                        <td style="text-align: right;">${formatCurrency((product.unitPrice || product.price || 0) * (product.quantity || 0))}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="totals">
        <div class="total-row">
            <span><strong>Subtotal:</strong></span>
            <span><strong>${formatCurrency(subtotal)}</strong></span>
        </div>
        ${remise > 0 ? `
        <div class="total-row">
            <span>Discount:</span>
            <span>-${formatCurrency(remise)}</span>
        </div>
        ` : ''}
        ${advance > 0 ? `
        <div class="total-row">
            <span>Advance Payment:</span>
            <span>-${formatCurrency(advance)}</span>
        </div>
        ` : ''}
        <div class="total-row final-total">
            <span>AMOUNT DUE:</span>
            <span>${formatCurrency(rest)}</span>
        </div>
    </div>



    <div class="footer">
        <p><strong>Thank you for your business!</strong></p>

        <p>Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
    </div>
</body>
</html>
  `;
};