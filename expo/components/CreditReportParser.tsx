import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  parseCreditReport,
  toCompatAccounts,
  htmlToText,
  classifyNegative,
  reconstructPageLines,
  type ParsedCreditReport,
} from '@/lib/credit-report-parser';

let WebView: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require('react-native-webview').WebView;
}

export interface ParsedAccount {
  creditor: string;
  /** Furnisher mailing address, when extractable from the report. */
  furnisherAddress?: string;
  accountNumber: string;
  balance: string;
  status: string;
  openDate: string;
  lastReported: string;
  negativeType?: string;
}

interface CreditReportParserProps {
  onAccountsParsed: (accounts: ParsedAccount[], bureau: string) => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

// ---------------------------------------------------------------------------
// Shared fallback + engine-runner, used by BOTH web and native platforms so
// there is exactly ONE parsing engine in the app (the shared engine in
// lib/credit-report-parser). The WebView on native now only extracts raw
// text (with proper line reconstruction) from the PDF and hands it back to
// React Native via postMessage; the actual account parsing happens here,
// identically to the web platform.
// ---------------------------------------------------------------------------

// The old regex-only "generic" splitter. Kept ONLY as the last-resort
// fallback when the new engine returns zero accounts for a non-empty
// file — better to surface raw guesses (flagged as low-confidence) than
// to show nothing.
function genericAccountsFallback(text: string): ParsedAccount[] {
  const determineNegativeType = (status: string, section: string): string | undefined => {
    const res = classifyNegative(status, section);
    return res.isNegative ? res.negativeType : undefined;
  };

  const accounts: ParsedAccount[] = [];
  const negativeKeywords = [
    'potentially negative', 'negative items', 'adverse accounts',
    'derogatory', 'collection', 'charge-off', 'charged off',
    'past due', 'delinquent', 'late payment', 'late 30', 'late 60', 'late 90',
    'days late', 'in dispute', 'settlement', 'foreclosure', 'repossession',
    'bankruptcy', 'public record', 'tax lien', 'judgment', 'default'
  ];

  const sections = text.split(/(?=(?:[A-Z][a-z]+ )+(?:Bank|Financial|Credit|Mortgage|Auto|Loan|Card|Services|Inc|LLC|Corp|Corporation))/);

  for (const section of sections) {
    const hasNegativeInfo = negativeKeywords.some(keyword =>
      section.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasNegativeInfo || sections.length <= 5) {
      const creditorMatch = section.match(/^(?:[A-Z][a-z]+ )+(?:Bank|Financial|Credit|Mortgage|Auto|Loan|Card|Services|Inc|LLC|Corp|Corporation)/);
      const creditor = creditorMatch ? creditorMatch[0].trim() : null;

      if (creditor && creditor.length >= 2) {
        const accountNumberMatch = section.match(/(?:Account\s*(?:#|Number|No):?\s*|#\s*)([\w\d-*]+)/i);
        const accountNumber = accountNumberMatch ? accountNumberMatch[1].trim() : 'Unknown';

        const balanceMatch = section.match(/(?:Balance|Amount|Debt):?\s*\$?([\d,]+\.\d{2}|\d+)/i);
        const balance = balanceMatch ? balanceMatch[1].trim() : 'Unknown';

        const statusMatch = section.match(/(?:Status|Condition|Payment Status):?\s*([^,\n\r.]+)/i) ||
                          section.match(/(?:30|60|90|120|150|180)\s*days?\s*(?:past\s*due|late)/i);
        const status = statusMatch ? statusMatch[0].trim() : 'Unknown';

        const openDateMatch = section.match(/(?:Open(?:ed)?\s*(?:Date|On):?\s*|Date\s*Opened:?\s*)([A-Za-z]+\s*\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        const openDate = openDateMatch ? openDateMatch[1].trim() : 'Unknown';

        const lastReportedMatch = section.match(/(?:Last\s*Reported|Reported\s*Date|Date\s*Reported):?\s*([A-Za-z]+\s*\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
        const lastReported = lastReportedMatch ? lastReportedMatch[1].trim() : 'Unknown';

        accounts.push({
          creditor,
          accountNumber,
          balance,
          status,
          openDate,
          lastReported,
          negativeType: determineNegativeType(status, section)
        });
      }
    }
  }

  const uniqueAccounts: ParsedAccount[] = [];
  const seen = new Set<string>();

  for (const account of accounts) {
    const key = account.creditor + '-' + account.accountNumber;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueAccounts.push(account);
    }
  }

  return uniqueAccounts;
}

interface EngineResult {
  accounts: ParsedAccount[];
  detectedBureau: string;
  warnings: string[];
}

// Runs the ONE shared parsing engine (lib/credit-report-parser) against
// already-extracted plain text. Used identically on web and native.
function runCreditReportEngine(
  fullText: string,
  userBureau: string,
  sourceFormat: 'pdf' | 'html' | 'text'
): EngineResult {
  const report: ParsedCreditReport = parseCreditReport(fullText, {
    userBureau,
    sourceFormat,
  });

  let accounts: ParsedAccount[] = toCompatAccounts(report.accounts);
  let detectedBureau: string;

  if (report.bureaus.length > 1) {
    detectedBureau = 'Combined (3-Bureau)';
  } else {
    detectedBureau = report.bureau === 'unknown' ? 'generic' : report.bureau;
  }

  // Last-resort fallback: keep the old generic splitter alive only when
  // the new engine found nothing at all in a non-empty file.
  if (accounts.length === 0 && fullText.trim().length > 0) {
    accounts = genericAccountsFallback(fullText);
  }

  return { accounts, detectedBureau, warnings: report.warnings };
}

const PARSER_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Credit Report Parser</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js"></script>
    <style>
        :root {
            --primary-color: #1a4b84;
            --primary-dark: #0d3b6f;
            --primary-light: #e6eef7;
            --secondary-color: #f7941d;
            --text-color: #333333;
            --text-light: #666666;
            --background-color: #f8f9fa;
            --card-bg: #ffffff;
            --border-color: #e2e8f0;
            --success-color: #28a745;
            --error-color: #dc3545;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            background-color: var(--background-color);
            color: var(--text-color);
            padding: 16px;
        }
        
        .container {
            max-width: 100%;
        }
        
        h2 {
            font-size: 18px;
            color: var(--primary-color);
            margin-bottom: 16px;
        }
        
        .bureau-selector {
            margin-bottom: 20px;
        }
        
        .bureau-selector label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: var(--text-color);
        }
        
        .bureau-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .bureau-btn {
            flex: 1;
            min-width: 80px;
            padding: 12px 8px;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            background: white;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-color);
            cursor: pointer;
            text-align: center;
        }
        
        .bureau-btn.active {
            background: var(--primary-color);
            border-color: var(--primary-color);
            color: white;
        }
        
        .file-input-wrapper {
            margin-bottom: 20px;
        }
        
        .file-label {
            display: block;
            padding: 40px 20px;
            border: 2px dashed var(--border-color);
            border-radius: 12px;
            background: var(--primary-light);
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .file-label:hover {
            border-color: var(--primary-color);
        }
        
        .file-label.has-file {
            background: #d4edda;
            border-color: var(--success-color);
            border-style: solid;
        }
        
        .file-label svg {
            width: 48px;
            height: 48px;
            margin-bottom: 12px;
            color: var(--primary-color);
        }
        
        .file-label p {
            font-size: 14px;
            color: var(--text-color);
            margin-bottom: 4px;
        }
        
        .file-label small {
            font-size: 12px;
            color: var(--text-light);
        }
        
        #fileInput {
            display: none;
        }
        
        .parse-btn {
            width: 100%;
            padding: 16px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        
        .parse-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .parse-btn:hover:not(:disabled) {
            background: var(--primary-dark);
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .loading.show {
            display: block;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border-color);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .status-text {
            font-size: 14px;
            color: var(--text-light);
        }
        
        .error-message {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 12px;
            border-radius: 8px;
            margin-top: 16px;
            display: none;
        }
        
        .error-message.show {
            display: block;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--border-color);
            border-radius: 4px;
            margin-top: 12px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--primary-color);
            width: 0%;
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Upload Credit Report</h2>
        
        <div class="bureau-selector">
            <label>Select Credit Bureau:</label>
            <div class="bureau-buttons">
                <button class="bureau-btn active" data-bureau="auto">Auto</button>
                <button class="bureau-btn" data-bureau="experian">Experian</button>
                <button class="bureau-btn" data-bureau="equifax">Equifax</button>
                <button class="bureau-btn" data-bureau="transunion">TransUnion</button>
            </div>
        </div>
        
        <div class="file-input-wrapper">
            <label for="fileInput" class="file-label" id="fileLabel">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p id="fileName">Tap to select credit report PDF</p>
                <small>Supports PDF format</small>
            </label>
            <input type="file" id="fileInput" accept=".pdf">
        </div>
        
        <button class="parse-btn" id="parseBtn" disabled>Parse Report</button>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p class="status-text" id="statusText">Processing...</p>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        </div>
        
        <div class="error-message" id="errorMessage"></div>
    </div>
    
    <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
        
        let selectedBureau = 'auto';
        let selectedFile = null;
        
        // Bureau selection
        document.querySelectorAll('.bureau-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.bureau-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedBureau = this.dataset.bureau;
            });
        });
        
        // File selection
        const fileInput = document.getElementById('fileInput');
        const fileLabel = document.getElementById('fileLabel');
        const fileName = document.getElementById('fileName');
        const parseBtn = document.getElementById('parseBtn');
        
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                selectedFile = e.target.files[0];
                fileName.textContent = selectedFile.name;
                fileLabel.classList.add('has-file');
                parseBtn.disabled = false;
            }
        });
        
        // Parse button
        parseBtn.addEventListener('click', handleParse);

        // ----------------------------------------------------------------
        // Line reconstruction (JS port of lib/credit-report-parser's
        // reconstructPageLines). This WebView's ONLY job is to extract
        // PDF text with correct line structure preserved and hand it back
        // to React Native via postMessage. ALL account parsing/classifying
        // happens on the RN side using the single shared engine
        // (lib/credit-report-parser) - this file no longer contains its
        // own separate/duplicate parsing logic.
        // ----------------------------------------------------------------
        function reconstructPageLines(items, yTolerance) {
            yTolerance = yTolerance || 2;
            const usable = items.filter(function (it) {
                return it && typeof it.str === 'string' && it.str !== '';
            });
            if (usable.length === 0) return '';

            const rows = new Map();
            for (let i = 0; i < usable.length; i++) {
                const it = usable[i];
                const y = Math.round(it.transform[5]);
                if (rows.has(y)) rows.get(y).push(it);
                else rows.set(y, [it]);
            }

            const sortedY = Array.from(rows.keys()).sort(function (a, b) { return b - a; });

            const mergedRowKeys = [];
            let bucket = [];
            let lastY = null;
            for (let i = 0; i < sortedY.length; i++) {
                const y = sortedY[i];
                if (lastY === null || Math.abs(lastY - y) <= yTolerance) bucket.push(y);
                else { mergedRowKeys.push(bucket); bucket = [y]; }
                lastY = y;
            }
            if (bucket.length) mergedRowKeys.push(bucket);

            const lines = [];
            for (let r = 0; r < mergedRowKeys.length; r++) {
                const ys = mergedRowKeys[r];
                let rowItems = [];
                for (let j = 0; j < ys.length; j++) {
                    const arr = rows.get(ys[j]);
                    if (arr) rowItems = rowItems.concat(arr);
                }
                rowItems.sort(function (a, b) { return a.transform[4] - b.transform[4]; });

                let line = '';
                let lastEndX = null;
                for (let k = 0; k < rowItems.length; k++) {
                    const it = rowItems[k];
                    // Ignore whitespace-only items: some PDF exporters emit
                    // a lone " " with a wildly inflated width to pad a
                    // table column, which corrupts lastEndX and hides the
                    // real gap between a field label and its value.
                    if (it.str.trim() === '') continue;
                    const x = it.transform[4];
                    if (lastEndX !== null) {
                        const gap = x - lastEndX;
                        if (gap > 20) line += '  ';
                        else if (gap > 1 && !/\s$/.test(line) && !/^\s/.test(it.str)) line += ' ';
                    }
                    line += it.str;
                    lastEndX = x + (typeof it.width === 'number' ? it.width : it.str.length * 5);
                }
                lines.push(line);
            }
            return lines.join('\n');
        }
        
        async function handleParse() {
            if (!selectedFile) return;
            
            const loading = document.getElementById('loading');
            const errorMessage = document.getElementById('errorMessage');
            const statusText = document.getElementById('statusText');
            const progressFill = document.getElementById('progressFill');
            
            loading.classList.add('show');
            errorMessage.classList.remove('show');
            parseBtn.disabled = true;
            
            sendMessage({ type: 'loading', loading: true });
            
            try {
                statusText.textContent = 'Reading PDF file...';
                progressFill.style.width = '10%';
                
                const arrayBuffer = await selectedFile.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                statusText.textContent = 'Extracting text from ' + pdf.numPages + ' pages...';
                progressFill.style.width = '30%';
                
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = reconstructPageLines(textContent.items);
                    fullText += pageText + '\n\n';
                    
                    const progress = 30 + (i / pdf.numPages * 40);
                    progressFill.style.width = progress + '%';
                    statusText.textContent = 'Extracting page ' + i + ' of ' + pdf.numPages + '...';
                }
                
                progressFill.style.width = '90%';
                statusText.textContent = 'Sending text for analysis...';

                // Hand the raw, line-reconstructed text back to React Native.
                // React Native runs it through the SAME shared parsing
                // engine (lib/credit-report-parser) used on web - no
                // separate/duplicate logic lives in this WebView.
                sendMessage({
                    type: 'extractedText',
                    text: fullText,
                    selectedBureau: selectedBureau,
                    sourceFormat: 'pdf'
                });

                progressFill.style.width = '100%';
                statusText.textContent = 'Analyzing credit report...';
                
            } catch (error) {
                console.error('Parse error:', error);
                loading.classList.remove('show');
                errorMessage.textContent = 'Error parsing PDF: ' + error.message;
                errorMessage.classList.add('show');
                parseBtn.disabled = false;
                
                sendMessage({ type: 'error', error: error.message });
                sendMessage({ type: 'loading', loading: false });
            }
        }

        // React Native tells us when it's done analyzing so we can reset
        // the loading UI and re-enable the parse button.
        function receiveAnalysisComplete(payload) {
            const loading = document.getElementById('loading');
            const statusText = document.getElementById('statusText');
            loading.classList.remove('show');
            parseBtn.disabled = false;
            if (payload && typeof payload.message === 'string') {
                statusText.textContent = payload.message;
            }
        }
        window.receiveAnalysisComplete = receiveAnalysisComplete;
        
        function sendMessage(data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
            }
        }
    </script>
</body>
</html>
`;

function WebCreditReportParser({
  onAccountsParsed,
  onError,
  onLoadingChange,
}: CreditReportParserProps) {
  const [selectedBureau, setSelectedBureau] = useState<string>('auto');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bureaus = ['auto', 'experian', 'equifax', 'transunion'];

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMessage('');
    }
  }, []);

  const handleParse = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setErrorMessage('');
    onLoadingChange(true);
    
    try {
      const fileName = selectedFile.name.toLowerCase();
      const isPdf = fileName.endsWith('.pdf') || selectedFile.type === 'application/pdf';
      const isHtml = /\.(html?|xhtml)$/i.test(fileName) || /text\/html/i.test(selectedFile.type);
      
      let fullText = '';
      let sourceFormat: 'pdf' | 'html' | 'text' = 'text';
      
      if (isPdf) {
        setStatusText('Loading PDF.js library...');
        setProgress(10);
        
        const pdfjsLib = await import('pdfjs-dist');
        // The worker version must exactly match the installed pdfjs-dist version, or
        // pdf.js fails with: The API version "X" does not match the Worker version "Y".
        // Deriving the URL from pdfjsLib.version keeps them in sync automatically
        // (jsdelivr serves the exact npm build for any released version).
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        
        setStatusText('Reading PDF file...');
        setProgress(20);
        
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        setStatusText(`Extracting text from ${pdf.numPages} pages...`);
        setProgress(30);
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // CRITICAL: reconstruct real lines from text-item Y/X coordinates
          // instead of naively joining all items with a single space. A
          // flattened join destroys every line break the downstream
          // parsing engine relies on (splitAccountBlocks, section
          // anchors, etc.), which previously collapsed entire reports
          // into a single fake "account".
          const pageText = reconstructPageLines(textContent.items as any);
          fullText += pageText + '\n\n';
          
          const progressValue = 30 + (i / pdf.numPages * 40);
          setProgress(progressValue);
          setStatusText(`Extracting page ${i} of ${pdf.numPages}...`);
        }
        sourceFormat = 'pdf';
      } else if (isHtml) {
        setStatusText('Reading HTML file...');
        setProgress(30);
        const rawHtml = await selectedFile.text();
        fullText = htmlToText(rawHtml);
        sourceFormat = 'html';
        setProgress(70);
      } else {
        // Plain text (.txt) — and anything unrecognized as PDF/HTML is
        // treated as text too; the engine flags unknown formats in
        // reportFlags instead of failing hard.
        setStatusText('Reading text file...');
        setProgress(30);
        fullText = await selectedFile.text();
        sourceFormat = 'text';
        setProgress(70);
      }
      
      setStatusText('Analyzing credit report...');
      setProgress(80);
      
      // ONE shared engine (used identically on web + native): weighted
      // bureau detection, combined-report splitting, per-bureau
      // labeled-field parsing, normalization, confidence + flags. See
      // lib/credit-report-parser/.
      const { accounts, detectedBureau, warnings } = runCreditReportEngine(
        fullText,
        selectedBureau,
        sourceFormat
      );
      
      const negativeCount = accounts.filter(a => a.negativeType).length;
      const warningText = warnings.length > 0 ? warnings[0] : '';
      
      setProgress(100);
      setStatusText(`Found ${accounts.length} accounts (${negativeCount} negative)`);
      
      setTimeout(() => {
        setIsLoading(false);
        onLoadingChange(false);
        onAccountsParsed(accounts, detectedBureau);
        if (warningText) {
          // Surface the first engine warning so the user knows when data
          // quality was questionable — never silently swallowed.
          console.warn('[CreditReportParser]', warnings.join(' | '));
        }
      }, 500);
      
    } catch (error: any) {
      console.error('Parse error:', error);
      setIsLoading(false);
      setErrorMessage('Error parsing file: ' + error.message);
      onLoadingChange(false);
      onError(error.message);
    }
  }, [selectedFile, selectedBureau, onAccountsParsed, onError, onLoadingChange]);

  return (
    <View style={webStyles.container}>
      <Text style={webStyles.title}>Upload Credit Report</Text>
      
      <View style={webStyles.bureauSelector}>
        <Text style={webStyles.label}>Select Credit Bureau:</Text>
        <View style={webStyles.bureauButtons}>
          {bureaus.map((bureau) => (
            <TouchableOpacity
              key={bureau}
              style={[
                webStyles.bureauButton,
                selectedBureau === bureau && webStyles.bureauButtonActive
              ]}
              onPress={() => setSelectedBureau(bureau)}
            >
              <Text style={[
                webStyles.bureauButtonText,
                selectedBureau === bureau && webStyles.bureauButtonTextActive
              ]}>
                {bureau.charAt(0).toUpperCase() + bureau.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <TouchableOpacity
        style={[webStyles.fileLabel, selectedFile && webStyles.fileLabelHasFile]}
        onPress={() => fileInputRef.current?.click()}
      >
        {selectedFile ? (
          <CheckCircle color={Colors.success} size={48} />
        ) : (
          <Upload color={Colors.primary} size={48} />
        )}
        <Text style={webStyles.fileName}>
          {selectedFile ? selectedFile.name : 'Tap to select credit report'}
        </Text>
        <Text style={webStyles.fileHint}>Supports PDF, HTML & plain text</Text>
      </TouchableOpacity>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.html,.htm,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <TouchableOpacity
        style={[webStyles.parseButton, (!selectedFile || isLoading) && webStyles.parseButtonDisabled]}
        onPress={handleParse}
        disabled={!selectedFile || isLoading}
      >
        <Text style={webStyles.parseButtonText}>
          {isLoading ? 'Processing...' : 'Parse Report'}
        </Text>
      </TouchableOpacity>
      
      {isLoading && (
        <View style={webStyles.loadingContainer}>
          <View style={webStyles.progressBar}>
            <View style={[webStyles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={webStyles.statusText}>{statusText}</Text>
        </View>
      )}
      
      {errorMessage ? (
        <View style={webStyles.errorContainer}>
          <AlertCircle color={Colors.error} size={20} />
          <Text style={webStyles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

function NativeCreditReportParser({
  onAccountsParsed,
  onError,
  onLoadingChange,
}: CreditReportParserProps) {
  const webViewRef = useRef<any>(null);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        console.log('WebView message:', data.type);

        switch (data.type) {
          case 'extractedText': {
            // The WebView only extracted raw, line-reconstructed PDF
            // text. Run it through the SAME shared engine used on web
            // (lib/credit-report-parser) so both platforms produce
            // identical results — no separate/duplicate parsing logic.
            const fullText: string = data.text || '';
            const selectedBureau: string = data.selectedBureau || 'auto';
            const sourceFormat: 'pdf' | 'html' | 'text' = data.sourceFormat || 'pdf';

            const { accounts, detectedBureau, warnings } = runCreditReportEngine(
              fullText,
              selectedBureau,
              sourceFormat
            );

            if (warnings.length > 0) {
              console.warn('[CreditReportParser]', warnings.join(' | '));
            }

            const negativeCount = accounts.filter((a) => a.negativeType).length;
            webViewRef.current?.injectJavaScript(
              `window.receiveAnalysisComplete && window.receiveAnalysisComplete(${JSON.stringify({
                message: `Found ${accounts.length} accounts (${negativeCount} negative)`,
              })}); true;`
            );

            onLoadingChange(false);
            onAccountsParsed(accounts, detectedBureau);
            break;
          }
          case 'error':
            onLoadingChange(false);
            onError(data.error);
            break;
          case 'loading':
            onLoadingChange(data.loading);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebView message:', error);
      }
    },
    [onAccountsParsed, onError, onLoadingChange]
  );

  if (!WebView) {
    return (
      <View style={styles.container}>
        <Text>WebView not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: PARSER_HTML }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        scrollEnabled={true}
        nestedScrollEnabled={true}
      />
    </View>
  );
}

export default function CreditReportParser(props: CreditReportParserProps) {
  if (Platform.OS === 'web') {
    return <WebCreditReportParser {...props} />;
  }
  return <NativeCreditReportParser {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 450,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 16,
  },
  bureauSelector: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  bureauButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bureauButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  bureauButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bureauButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  bureauButtonTextActive: {
    color: Colors.surface,
  },
  fileLabel: {
    padding: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    marginBottom: 20,
  },
  fileLabelHasFile: {
    backgroundColor: Colors.success + '15',
    borderColor: Colors.success,
    borderStyle: 'solid',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  fileHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  parseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  parseButtonDisabled: {
    opacity: 0.5,
  },
  parseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  statusText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    borderWidth: 1,
    borderColor: Colors.error + '30',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.error,
  },
});
