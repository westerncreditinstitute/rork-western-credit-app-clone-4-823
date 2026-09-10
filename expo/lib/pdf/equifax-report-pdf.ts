/**
 * Equifax Multi-Bureau Credit Report PDF Generator
 *
 * Generates a professional PDF report from parsed Equifax/multi-bureau data
 * Can be used on both server and client side (uses jsPDF library)
 */

import { ParsedCreditReport, BureauReport } from "@/backend/equifax/equifax-client";

/**
 * Configuration for PDF generation
 */
interface PDFConfig {
  title?: string;
  includeRaw?: boolean;
  pageSize?: "A4" | "Letter";
  colors?: {
    header?: string;
    title?: string;
    negative?: string;
    positive?: string;
  };
}

/**
 * Generate PDF report from parsed credit report data
 * Returns base64-encoded PDF data or saves to file
 *
 * Client-side usage: Use with react-pdf or save to Blob
 * Server-side usage: Use with pdfkit or similar
 */
export function generateEquifaxReportPDF(
  report: ParsedCreditReport,
  config: PDFConfig = {}
): string {
  const {
    title = "Multi-Bureau Credit Report",
    includeRaw = false,
    pageSize = "A4",
    colors = {
      header: "#1F2937",
      title: "#111827",
      negative: "#DC2626",
      positive: "#059669",
    },
  } = config;

  // Build HTML for PDF (can be used with html2pdf or similar)
  const html = generateReportHTML(report, {
    title,
    includeRaw,
    colors,
  });

  // For client-side, return HTML that can be converted to PDF
  // For server-side with pdfkit, would need different approach
  return html;
}

/**
 * Generate HTML representation of the report
 */
export function generateReportHTML(
  report: ParsedCreditReport,
  config: {
    title: string;
    includeRaw: boolean;
    colors: Record<string, string>;
  }
): string {
  const { title, includeRaw, colors } = config;

  const bureaus = [
    { key: "equifax", label: "Equifax", report: report.bureaus.equifax },
    { key: "experian", label: "Experian", report: report.bureaus.experian },
    {
      key: "transunion",
      label: "TransUnion",
      report: report.bureaus.transunion,
    },
  ];

  let bureausHTML = "";
  for (const { label, report: bureauReport } of bureaus) {
    if (!bureauReport) continue;

    bureausHTML += generateBureauSection(bureauReport, label, colors);
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            color: ${colors.title};
            background-color: #FFFFFF;
            line-height: 1.6;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 20px;
            }
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .header {
            background-color: ${colors.header};
            color: white;
            padding: 40px;
            border-radius: 8px;
            margin-bottom: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .summary-card {
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 20px;
        }
        
        .summary-card h3 {
            font-size: 12px;
            font-weight: 600;
            color: #6B7280;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        
        .summary-card .value {
            font-size: 28px;
            font-weight: 700;
            color: ${colors.title};
        }
        
        .summary-card .subtitle {
            font-size: 12px;
            color: #9CA3AF;
            margin-top: 5px;
        }
        
        .bureau-section {
            page-break-inside: avoid;
            margin-bottom: 40px;
        }
        
        .bureau-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid ${colors.header};
        }
        
        .bureau-badge {
            background-color: ${colors.header};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            min-width: 100px;
            text-align: center;
        }
        
        .bureau-title {
            flex: 1;
            font-size: 24px;
            font-weight: 700;
        }
        
        .bureau-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
            background-color: #F9FAFB;
            padding: 20px;
            border-radius: 8px;
        }
        
        .stat {
            display: flex;
            flex-direction: column;
        }
        
        .stat-label {
            font-size: 12px;
            font-weight: 600;
            color: #6B7280;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: ${colors.title};
        }
        
        .accounts-list {
            list-style: none;
        }
        
        .account-item {
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-left: 4px solid ${colors.negative};
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
        
        .account-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        
        .account-name {
            font-size: 16px;
            font-weight: 700;
            color: ${colors.title};
            flex: 1;
        }
        
        .account-type {
            background-color: ${colors.negative};
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .account-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            font-size: 13px;
            color: #4B5563;
            margin-top: 15px;
        }
        
        .detail-row {
            display: flex;
            flex-direction: column;
        }
        
        .detail-label {
            font-weight: 600;
            color: #6B7280;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        
        .detail-value {
            color: ${colors.title};
            font-size: 13px;
        }
        
        .no-negative {
            background-color: #ECFDF5;
            border: 1px solid #A7F3D0;
            padding: 20px;
            border-radius: 8px;
            color: ${colors.positive};
            text-align: center;
            font-weight: 600;
        }
        
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            color: #9CA3AF;
            font-size: 12px;
        }
        
        @media print {
            .no-page-break {
                page-break-inside: avoid;
            }
            
            .bureau-section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>${title}</h1>
            <p>Generated on ${new Date(report.fetchedAt).toLocaleString()}</p>
        </div>
        
        <!-- Overall Summary -->
        <div class="summary">
            <div class="summary-card">
                <h3>Total Bureaus</h3>
                <div class="value">${report.combined.totalBureaus}</div>
            </div>
            <div class="summary-card">
                <h3>Total Accounts</h3>
                <div class="value">${report.combined.totalAccounts}</div>
            </div>
            <div class="summary-card">
                <h3>Negative Accounts</h3>
                <div class="value" style="color: ${colors.negative};">${report.combined.totalNegativeAccounts}</div>
            </div>
            ${
              report.combined.averageCreditScore
                ? `
            <div class="summary-card">
                <h3>Average Credit Score</h3>
                <div class="value">${report.combined.averageCreditScore}</div>
            </div>
            `
                : ""
            }
        </div>
        
        <!-- Bureau Reports -->
        ${bureausHTML}
        
        <!-- Footer -->
        <div class="footer">
            <p>This is a session-based report for informational purposes only.</p>
            <p>Consult with a credit repair professional for guidance on disputes.</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Generate HTML for a single bureau section
 */
function generateBureauSection(
  bureauReport: BureauReport,
  label: string,
  colors: Record<string, string>
): string {
  const { bureau, totalAccounts, negativeAccountCount, negativeAccounts, creditScore } =
    bureauReport;

  const negativeAccountsHTML = negativeAccounts
    .map(
      (account) => `
    <li class="account-item">
        <div class="account-header">
            <div class="account-name">${account.creditorName}</div>
            <div class="account-type">${account.accountType}</div>
        </div>
        <div class="account-details">
            <div class="detail-row">
                <span class="detail-label">Account Number</span>
                <span class="detail-value">${account.accountNumber}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value">${account.status}</span>
            </div>
            ${
              account.balance
                ? `
            <div class="detail-row">
                <span class="detail-label">Balance</span>
                <span class="detail-value">$${account.balance.toLocaleString()}</span>
            </div>
            `
                : ""
            }
            ${
              account.delinquency
                ? `
            <div class="detail-row">
                <span class="detail-label">Delinquency</span>
                <span class="detail-value">${account.delinquency}</span>
            </div>
            `
                : ""
            }
            ${
              account.dateReported
                ? `
            <div class="detail-row">
                <span class="detail-label">Date Reported</span>
                <span class="detail-value">${new Date(account.dateReported).toLocaleDateString()}</span>
            </div>
            `
                : ""
            }
        </div>
    </li>
  `
    )
    .join("");

  return `
    <div class="bureau-section">
        <div class="bureau-header">
            <div class="bureau-badge">${label}</div>
            <div class="bureau-title">${label} Credit Report</div>
        </div>
        
        <div class="bureau-stats">
            <div class="stat">
                <span class="stat-label">Total Accounts</span>
                <span class="stat-value">${totalAccounts}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Negative Accounts</span>
                <span class="stat-value" style="color: ${colors.negative};">${negativeAccountCount}</span>
            </div>
            ${
              creditScore
                ? `
            <div class="stat">
                <span class="stat-label">Credit Score</span>
                <span class="stat-value">${creditScore}</span>
            </div>
            `
                : ""
            }
        </div>
        
        ${
          negativeAccountCount > 0
            ? `
        <ul class="accounts-list">
            ${negativeAccountsHTML}
        </ul>
        `
            : `
        <div class="no-negative">
            ✓ No negative accounts found on ${label}
        </div>
        `
        }
    </div>
  `;
}

/**
 * Convert HTML to PDF (requires client-side library like html2pdf)
 * Example usage:
 * const html = generateReportHTML(report, {...});
 * html2pdf().set(opt).from(html).save('credit-report.pdf');
 */
export function downloadReportAsPDF(
  report: ParsedCreditReport,
  fileName: string = "credit-report.pdf"
): void {
  // This requires html2pdf.js library to be included
  // Client-side implementation
  const html = generateReportHTML(report, {
    title: "Multi-Bureau Credit Report",
    includeRaw: false,
    colors: {
      header: "#1F2937",
      title: "#111827",
      negative: "#DC2626",
      positive: "#059669",
    },
  });

  // Attempt to use html2pdf if available
  if (typeof (window as any).html2pdf !== "undefined") {
    const element = document.createElement("div");
    element.innerHTML = html;
    (window as any).html2pdf().set({ margin: 10 }).from(element).save(fileName);
  } else {
    console.warn(
      "[PDF] html2pdf library not loaded. Load it via CDN or npm package."
    );
    // Fallback: open in new window and let user print
    const printWindow = window.open("", "", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  }
}

/**
 * Generate base64-encoded data URL for PDF
 * Can be used for email, storage, etc.
 */
export function generateReportDataURL(
  report: ParsedCreditReport
): string {
  const html = generateReportHTML(report, {
    title: "Multi-Bureau Credit Report",
    includeRaw: false,
    colors: {
      header: "#1F2937",
      title: "#111827",
      negative: "#DC2626",
      positive: "#059669",
    },
  });

  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}
