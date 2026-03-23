import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';

let WebView: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebView = require('react-native-webview').WebView;
}

export interface ParsedAccount {
  creditor: string;
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
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + ' ';
                    
                    const progress = 30 + (i / pdf.numPages * 40);
                    progressFill.style.width = progress + '%';
                    statusText.textContent = 'Extracting page ' + i + ' of ' + pdf.numPages + '...';
                }
                
                statusText.textContent = 'Analyzing credit report...';
                progressFill.style.width = '80%';
                
                let detectedBureau = selectedBureau;
                if (selectedBureau === 'auto') {
                    detectedBureau = detectCreditBureau(fullText);
                }
                
                statusText.textContent = 'Parsing ' + capitalizeFirstLetter(detectedBureau) + ' report...';
                
                const accounts = parseNegativeAccounts(fullText, detectedBureau);
                
                progressFill.style.width = '100%';
                statusText.textContent = 'Found ' + accounts.length + ' potentially negative accounts';
                
                setTimeout(() => {
                    loading.classList.remove('show');
                    parseBtn.disabled = false;
                    
                    sendMessage({
                        type: 'accounts',
                        accounts: accounts,
                        bureau: detectedBureau
                    });
                }, 500);
                
            } catch (error) {
                console.error('Parse error:', error);
                loading.classList.remove('show');
                errorMessage.textContent = 'Error parsing PDF: ' + error.message;
                errorMessage.classList.add('show');
                parseBtn.disabled = false;
                
                sendMessage({ type: 'error', error: error.message });
            }
            
            sendMessage({ type: 'loading', loading: false });
        }
        
        function sendMessage(data) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
            }
        }
        
        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }
        
        function detectCreditBureau(text) {
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes('equifax') && !lowerText.includes('experian') && !lowerText.includes('transunion')) {
                return 'equifax';
            } else if (lowerText.includes('experian') && !lowerText.includes('equifax') && !lowerText.includes('transunion')) {
                return 'experian';
            } else if (lowerText.includes('transunion') && !lowerText.includes('equifax') && !lowerText.includes('experian')) {
                return 'transunion';
            }
            
            if (lowerText.includes('date of status') && lowerText.includes('manner of payment')) {
                return 'equifax';
            } else if (lowerText.includes('status updated') && lowerText.includes('account condition')) {
                return 'experian';
            } else if (lowerText.includes('pay status') && lowerText.includes('account type')) {
                return 'transunion';
            }
            
            return 'generic';
        }
        
        function parseNegativeAccounts(text, bureau) {
            switch(bureau) {
                case 'equifax': return parseEquifaxAccounts(text);
                case 'experian': return parseExperianAccounts(text);
                case 'transunion': return parseTransUnionAccounts(text);
                default: return parseGenericAccounts(text);
            }
        }
        
        function parseEquifaxAccounts(text) {
            const accounts = [];
            const negativeKeywords = [
                'collection', 'charge-off', 'charged off', 'past due', 'delinquent', 
                '30 days past due', '60 days past due', '90 days past due',
                'manner of payment: late', 'foreclosure', 'repossession'
            ];
            
            const accountSections = text.split(/(?=Date Opened:|Account #:|Creditor Name:|Account Type:)/i);
            
            for (const section of accountSections) {
                const hasNegativeInfo = negativeKeywords.some(keyword => 
                    section.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (hasNegativeInfo || accountSections.length <= 5) {
                    const account = extractEquifaxAccountInfo(section);
                    if (account) accounts.push(account);
                }
            }
            
            return removeDuplicateAccounts(accounts);
        }
        
        function extractEquifaxAccountInfo(section) {
            const creditorMatch = section.match(/(?:Creditor Name:|Company Name:)\\s*([^\\n\\r]+)/i) ||
                                 section.match(/([A-Z][A-Za-z\\s&,.']+)(?=\\s+Account #)/i);
            const creditor = creditorMatch ? creditorMatch[1].trim() : null;
            
            if (!creditor || creditor.length < 2) return null;
            
            const accountNumberMatch = section.match(/(?:Account #:|Account Number:)\\s*([^\\n\\r]+)/i);
            const accountNumber = accountNumberMatch ? accountNumberMatch[1].trim() : 'Unknown';
            
            const balanceMatch = section.match(/(?:Balance:|Current Balance:)\\s*\\$?([\\d,]+\\.\\d{2}|\\d+)/i);
            const balance = balanceMatch ? balanceMatch[1].trim() : 'Unknown';
            
            const statusMatch = section.match(/(?:Status:|Account Status:|Manner of Payment:)\\s*([^\\n\\r]+)/i) ||
                              section.match(/(?:30|60|90|120)\\s*Days Past Due/i);
            const status = statusMatch ? statusMatch[0].trim() : 'Unknown';
            
            const openDateMatch = section.match(/(?:Date Opened:|Opened:)\\s*([^\\n\\r]+)/i);
            const openDate = openDateMatch ? openDateMatch[1].trim() : 'Unknown';
            
            const lastReportedMatch = section.match(/(?:Date of Status:|Last Reported:|Date Updated:)\\s*([^\\n\\r]+)/i);
            const lastReported = lastReportedMatch ? lastReportedMatch[1].trim() : 'Unknown';
            
            return {
                creditor, accountNumber, balance, status, openDate, lastReported,
                negativeType: determineNegativeType(status, section)
            };
        }
        
        function parseExperianAccounts(text) {
            const accounts = [];
            const negativeKeywords = [
                'collection', 'charge-off', 'charged off', 'past due', 'delinquent', 
                'late', 'missed payment', 'adverse', 'negative', 'status: bad debt',
                'payment status: late', 'foreclosure', 'repossession'
            ];
            
            const accountSections = text.split(/(?=Account Name:|Account Information:|ACCOUNT INFORMATION:)/i);
            
            for (const section of accountSections) {
                const hasNegativeInfo = negativeKeywords.some(keyword => 
                    section.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (hasNegativeInfo || accountSections.length <= 5) {
                    const account = extractExperianAccountInfo(section);
                    if (account) accounts.push(account);
                }
            }
            
            return removeDuplicateAccounts(accounts);
        }
        
        function extractExperianAccountInfo(section) {
            const creditorMatch = section.match(/(?:Account Name:|Creditor:|Company Name:)\\s*([^\\n\\r]+)/i) ||
                                 section.match(/^([A-Z][A-Za-z\\s&,.']+)(?=\\s+Account #)/i);
            const creditor = creditorMatch ? creditorMatch[1].trim() : null;
            
            if (!creditor || creditor.length < 2) return null;
            
            const accountNumberMatch = section.match(/(?:Account Number:|Account #:)\\s*([^\\n\\r]+)/i);
            const accountNumber = accountNumberMatch ? accountNumberMatch[1].trim() : 'Unknown';
            
            const balanceMatch = section.match(/(?:Balance:|Recent Balance:|Current Balance:)\\s*\\$?([\\d,]+\\.\\d{2}|\\d+)/i);
            const balance = balanceMatch ? balanceMatch[1].trim() : 'Unknown';
            
            const statusMatch = section.match(/(?:Status:|Account Status:|Payment Status:|Condition:)\\s*([^\\n\\r]+)/i) ||
                              section.match(/(?:30|60|90|120)\\s*Days Past Due/i);
            const status = statusMatch ? statusMatch[0].trim() : 'Unknown';
            
            const openDateMatch = section.match(/(?:Date Opened:|Opened Date:)\\s*([^\\n\\r]+)/i);
            const openDate = openDateMatch ? openDateMatch[1].trim() : 'Unknown';
            
            const lastReportedMatch = section.match(/(?:Status Updated:|Last Reported:|Date Updated:)\\s*([^\\n\\r]+)/i);
            const lastReported = lastReportedMatch ? lastReportedMatch[1].trim() : 'Unknown';
            
            return {
                creditor, accountNumber, balance, status, openDate, lastReported,
                negativeType: determineNegativeType(status, section)
            };
        }
        
        function parseTransUnionAccounts(text) {
            const accounts = [];
            const negativeKeywords = [
                'collection', 'charge-off', 'charged off', 'past due', 'delinquent', 
                'late', 'pay status: late', 'pay status: 30 days', 'pay status: 60 days',
                'pay status: 90 days', 'foreclosure', 'repossession'
            ];
            
            const accountSections = text.split(/(?=Company Name:|COMPANY NAME:|TRADELINE:|Account Type & Number:)/i);
            
            for (const section of accountSections) {
                const hasNegativeInfo = negativeKeywords.some(keyword => 
                    section.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (hasNegativeInfo || accountSections.length <= 5) {
                    const account = extractTransUnionAccountInfo(section);
                    if (account) accounts.push(account);
                }
            }
            
            return removeDuplicateAccounts(accounts);
        }
        
        function extractTransUnionAccountInfo(section) {
            const creditorMatch = section.match(/(?:Company Name:|Creditor:|Company:)\\s*([^\\n\\r]+)/i) ||
                                 section.match(/^([A-Z][A-Za-z\\s&,.']+)(?=\\s+Account #)/i);
            const creditor = creditorMatch ? creditorMatch[1].trim() : null;
            
            if (!creditor || creditor.length < 2) return null;
            
            const accountNumberMatch = section.match(/(?:Account Number:|Account #:|Account Type & Number:.*?)\\s*([^\\n\\r]+)/i);
            const accountNumber = accountNumberMatch ? accountNumberMatch[1].trim() : 'Unknown';
            
            const balanceMatch = section.match(/(?:Balance:|Current Balance:|High Balance:)\\s*\\$?([\\d,]+\\.\\d{2}|\\d+)/i);
            const balance = balanceMatch ? balanceMatch[1].trim() : 'Unknown';
            
            const statusMatch = section.match(/(?:Pay Status:|Account Status:|Status:)\\s*([^\\n\\r]+)/i) ||
                              section.match(/(?:30|60|90|120)\\s*Days Past Due/i);
            const status = statusMatch ? statusMatch[0].trim() : 'Unknown';
            
            const openDateMatch = section.match(/(?:Date Opened:|Opened:)\\s*([^\\n\\r]+)/i);
            const openDate = openDateMatch ? openDateMatch[1].trim() : 'Unknown';
            
            const lastReportedMatch = section.match(/(?:Date Updated:|Last Reported:|Date Reported:)\\s*([^\\n\\r]+)/i);
            const lastReported = lastReportedMatch ? lastReportedMatch[1].trim() : 'Unknown';
            
            return {
                creditor, accountNumber, balance, status, openDate, lastReported,
                negativeType: determineNegativeType(status, section)
            };
        }
        
        function parseGenericAccounts(text) {
            const accounts = [];
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
                    const account = extractGenericAccountInfo(section);
                    if (account) accounts.push(account);
                }
            }
            
            return removeDuplicateAccounts(accounts);
        }
        
        function extractGenericAccountInfo(section) {
            const creditorMatch = section.match(/^(?:[A-Z][a-z]+ )+(?:Bank|Financial|Credit|Mortgage|Auto|Loan|Card|Services|Inc|LLC|Corp|Corporation)/);
            const creditor = creditorMatch ? creditorMatch[0].trim() : extractCreditorName(section);
            
            if (!creditor || creditor.length < 2) return null;
            
            const accountNumberMatch = section.match(/(?:Account\\s*(?:#|Number|No):?\\s*|#\\s*)([\\w\\d-*]+)/i) || 
                                      section.match(/(?:Account|Acct)(?:\\s*#|\\s+Number|\\s+No)?:?\\s*([\\w\\d-*]+)/i);
            const accountNumber = accountNumberMatch ? accountNumberMatch[1].trim() : 'Unknown';
            
            const balanceMatch = section.match(/(?:Balance|Amount|Debt):?\\s*\\$?([\\d,]+\\.\\d{2}|\\d+)/i) || 
                               section.match(/\\$\\s*([\\d,]+\\.\\d{2}|\\d+)/);
            const balance = balanceMatch ? balanceMatch[1].trim() : 'Unknown';
            
            const statusMatch = section.match(/(?:Status|Condition|Payment Status):?\\s*([^,\\n\\r.]+)/i) ||
                              section.match(/(?:30|60|90|120|150|180)\\s*days?\\s*(?:past\\s*due|late)/i) ||
                              section.match(/(?:Charge[d\\s-]*off|Collection|Settled|Foreclosure|Repossession|Default)/i);
            const status = statusMatch ? statusMatch[0].trim() : extractStatus(section);
            
            const openDateMatch = section.match(/(?:Open(?:ed)?\\s*(?:Date|On):?\\s*|Date\\s*Opened:?\\s*)([A-Za-z]+\\s*\\d{1,2},?\\s*\\d{4}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})/i);
            const openDate = openDateMatch ? openDateMatch[1].trim() : 'Unknown';
            
            const lastReportedMatch = section.match(/(?:Last\\s*Reported|Reported\\s*Date|Date\\s*Reported):?\\s*([A-Za-z]+\\s*\\d{1,2},?\\s*\\d{4}|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})/i);
            const lastReported = lastReportedMatch ? lastReportedMatch[1].trim() : 'Unknown';
            
            return {
                creditor, accountNumber, balance, status: status || 'Unknown', openDate, lastReported,
                negativeType: determineNegativeType(status, section)
            };
        }
        
        function extractCreditorName(text) {
            const patterns = [
                /([A-Z][A-Za-z\\s&,.']+)(?=\\s+Account)/i,
                /([A-Z][A-Za-z\\s&,.']+)(?=\\s+opened)/i,
                /([A-Z][A-Za-z\\s&,.']+)(?=\\s+reported)/i
            ];
            
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) return match[1].trim();
            }
            
            return null;
        }
        
        function extractStatus(text) {
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes('collection')) return 'Collection';
            if (lowerText.includes('charge') && lowerText.includes('off')) return 'Charged Off';
            if (lowerText.includes('past due') || lowerText.includes('late')) {
                const daysMatch = text.match(/(\\d+)\\s*days?\\s*(?:past\\s*due|late)/i);
                return daysMatch ? daysMatch[1] + ' Days Late' : 'Past Due';
            }
            if (lowerText.includes('settled')) return 'Settled';
            if (lowerText.includes('foreclosure')) return 'Foreclosure';
            if (lowerText.includes('repossession')) return 'Repossession';
            if (lowerText.includes('bankruptcy')) return 'Bankruptcy';
            
            return null;
        }
        
        function determineNegativeType(status, section) {
            const lowerStatus = (status || '').toLowerCase();
            const lowerSection = section.toLowerCase();
            
            if (lowerStatus.includes('collection') || lowerSection.includes('collection')) return 'Collection Account';
            if (lowerStatus.includes('charge') || lowerSection.includes('charge-off') || lowerSection.includes('charged off')) return 'Charge-off';
            if (lowerStatus.includes('late') || lowerStatus.includes('past due') || lowerSection.includes('late payment')) return 'Late Payments';
            if (lowerStatus.includes('foreclosure') || lowerSection.includes('foreclosure')) return 'Foreclosure';
            if (lowerStatus.includes('repossession') || lowerSection.includes('repossession')) return 'Repossession';
            if (lowerStatus.includes('bankruptcy') || lowerSection.includes('bankruptcy')) return 'Bankruptcy';
            
            return 'Derogatory Status';
        }
        
        function removeDuplicateAccounts(accounts) {
            const uniqueAccounts = [];
            const seen = new Set();
            
            for (const account of accounts) {
                const key = account.creditor + '-' + account.accountNumber;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueAccounts.push(account);
                }
            }
            
            return uniqueAccounts;
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

  const detectCreditBureau = useCallback((text: string): string => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('equifax') && !lowerText.includes('experian') && !lowerText.includes('transunion')) {
      return 'equifax';
    } else if (lowerText.includes('experian') && !lowerText.includes('equifax') && !lowerText.includes('transunion')) {
      return 'experian';
    } else if (lowerText.includes('transunion') && !lowerText.includes('equifax') && !lowerText.includes('experian')) {
      return 'transunion';
    }
    
    return 'generic';
  }, []);

  const determineNegativeType = useCallback((status: string, section: string): string => {
    const lowerStatus = (status || '').toLowerCase();
    const lowerSection = section.toLowerCase();
    
    if (lowerStatus.includes('collection') || lowerSection.includes('collection')) return 'Collection Account';
    if (lowerStatus.includes('charge') || lowerSection.includes('charge-off') || lowerSection.includes('charged off')) return 'Charge-off';
    if (lowerStatus.includes('late') || lowerStatus.includes('past due') || lowerSection.includes('late payment')) return 'Late Payments';
    if (lowerStatus.includes('foreclosure') || lowerSection.includes('foreclosure')) return 'Foreclosure';
    if (lowerStatus.includes('repossession') || lowerSection.includes('repossession')) return 'Repossession';
    if (lowerStatus.includes('bankruptcy') || lowerSection.includes('bankruptcy')) return 'Bankruptcy';
    
    return 'Derogatory Status';
  }, []);

  const parseGenericAccounts = useCallback((text: string): ParsedAccount[] => {
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
  }, [determineNegativeType]);

  const handleParse = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setErrorMessage('');
    onLoadingChange(true);
    
    try {
      setStatusText('Loading PDF.js library...');
      setProgress(10);
      
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      setStatusText('Reading PDF file...');
      setProgress(20);
      
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setStatusText(`Extracting text from ${pdf.numPages} pages...`);
      setProgress(30);
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
        
        const progressValue = 30 + (i / pdf.numPages * 40);
        setProgress(progressValue);
        setStatusText(`Extracting page ${i} of ${pdf.numPages}...`);
      }
      
      setStatusText('Analyzing credit report...');
      setProgress(80);
      
      let detectedBureau = selectedBureau;
      if (selectedBureau === 'auto') {
        detectedBureau = detectCreditBureau(fullText);
      }
      
      setStatusText(`Parsing ${detectedBureau.charAt(0).toUpperCase() + detectedBureau.slice(1)} report...`);
      
      const accounts = parseGenericAccounts(fullText);
      
      setProgress(100);
      setStatusText(`Found ${accounts.length} potentially negative accounts`);
      
      setTimeout(() => {
        setIsLoading(false);
        onLoadingChange(false);
        onAccountsParsed(accounts, detectedBureau);
      }, 500);
      
    } catch (error: any) {
      console.error('Parse error:', error);
      setIsLoading(false);
      setErrorMessage('Error parsing PDF: ' + error.message);
      onLoadingChange(false);
      onError(error.message);
    }
  }, [selectedFile, selectedBureau, onAccountsParsed, onError, onLoadingChange, detectCreditBureau, parseGenericAccounts]);

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
          {selectedFile ? selectedFile.name : 'Tap to select credit report PDF'}
        </Text>
        <Text style={webStyles.fileHint}>Supports PDF format</Text>
      </TouchableOpacity>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
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
          case 'accounts':
            onAccountsParsed(data.accounts, data.bureau);
            break;
          case 'error':
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
