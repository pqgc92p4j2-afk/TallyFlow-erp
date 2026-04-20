import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { 
  FiUser, FiDollarSign, FiPercent, FiPrinter, FiPlus, 
  FiTrash2, FiInfo, FiBriefcase, FiHash, FiUploadCloud, FiCheckCircle, FiFileText
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
import '../styles/itrComputation.css';

const ITRComputation = () => {
  const { activeCompany } = useSelector((state) => state.company);
  const [activeTab, setActiveTab] = useState('form'); 
  const fileInputRef   = useRef(null);  // JSON
  const pdfInputRef    = useRef(null);  // Full ITR Form PDF
  const ackPdfInputRef = useRef(null);  // ITR-V Acknowledgment PDF
  const [debugInfo, setDebugInfo]   = useState(null);
  const [pdfParsed, setPdfParsed]   = useState(false);
  const [ackParsed, setAckParsed]   = useState(false);
  const [isJsonParsed, setIsJsonParsed] = useState(false);
  
  // State for form data
  const [formData, setFormData] = useState({
    // Personal Details
    assesseeName: '',
    fatherName: '',
    address: '',
    status: '',
    assessmentYear: '',
    pan: '',
    dob: '',
    aadhaar: '',
    gender: '',
    natureOfBusiness: '',
    tradeName: '',
    ward: '',
    resStatus: '',
    filingStatus: '',
    mobile: '',
    email: '',
    
    // Business Income (44AD)
    turnoverNonDigital: 0,
    turnoverECS: 0,
    turnoverCash: 0,
    manualNetProfit: 0,
    manualProfitECS: 0,   // E2a
    manualProfitCash: 0,  // E2b
    
    // Other Sources
    savingInterest: 0,
    fdInterest: 0,
    dividendIncome: 0,
    
    // Deductions
    standardDeduction: 0, 
    fee234F: 0, // Charges under section 234F
    
    // Arrays for dynamic tables
    prepaidTaxes: [],
    banks: [],
    dividends: [],

    signatureName: '',
    date: new Date().toISOString().split('T')[0],
    compuTaxCode: ''
  });

  // Derived calculations
  const calculateComputation = () => {
    // Turnover components
    // turnoverECS       = E1a Bank/ECS       6%
    // turnoverCash      = E1b Cash receipts  8%
    // turnoverNonDigital= E1c Any other mode 8%
    const totalTurnover = formData.turnoverNonDigital + formData.turnoverECS + formData.turnoverCash;
    
    // Deemed Profit calculations per 44AD rates
    const deemedECS        = Math.round(formData.turnoverECS * 0.06);           // 6% ECS/Bank
    const deemedCash       = Math.round(formData.turnoverCash * 0.08);          // 8% Cash
    const deemedNonDigital = Math.round(formData.turnoverNonDigital * 0.08);    // 8% Any other
    const totalDeemedProfit = deemedECS + deemedCash + deemedNonDigital;
    
    // Book Profit = EXACT declared amount from E2 (what assessee filed)
    // No override with deemed — show exactly what is in PDF/JSON
    const profitECS      = formData.manualProfitECS || Math.round(formData.turnoverECS * 0.06);
    const profitCash     = formData.manualProfitCash || Math.round((formData.turnoverCash + formData.turnoverNonDigital) * 0.08);
    
    // Total Business Income is E2c or sum of parts
    const businessIncome = formData.manualNetProfit || (profitECS + profitCash);
    
    // Percentages
    const ecsPct          = formData.turnoverECS > 0 ? ((profitECS / formData.turnoverECS) * 100).toFixed(2) : '6.00';
    const cashPct         = (formData.turnoverCash + formData.turnoverNonDigital) > 0 
                            ? ((profitCash / (formData.turnoverCash + formData.turnoverNonDigital)) * 100).toFixed(2) : '8.00';
    
    const netProfitPct    = totalTurnover > 0 ? ((businessIncome / totalTurnover) * 100).toFixed(2) : '0.00';

    const otherSourcesTotal = formData.savingInterest + formData.fdInterest + formData.dividendIncome;
    const grossTotalIncome  = businessIncome + otherSourcesTotal;
    const totalIncome       = Math.max(0, grossTotalIncome - formData.standardDeduction);
    const roundedIncome     = Math.round(totalIncome / 10) * 10;
    
    // ── New Tax Regime Slabs (Section 115BAC, FY 2024-25) ──────────────────
    let tax = 0;
    const ti = roundedIncome;
    if (ti > 1500000)       tax = (ti - 1500000) * 0.30 + 150000 + 50000 + 30000 + 20000;
    else if (ti > 1200000)  tax = (ti - 1200000) * 0.20 + 150000 + 50000 + 30000;
    else if (ti > 1000000)  tax = (ti - 1000000) * 0.15 + 150000 + 50000;
    else if (ti > 700000)   tax = (ti - 700000)  * 0.10 + 150000;
    else if (ti > 300000)   tax = (ti - 300000)  * 0.05;
    tax = Math.round(tax);

    // Rebate u/s 87A: full rebate if total income ≤ 7 lakh
    let rebate = 0;
    if (ti <= 700000) rebate = tax;
    
    const taxAfterRebate = tax - rebate;
    const fee234F        = formData.fee234F || 0;
    const totalTaxPayable = taxAfterRebate + fee234F;
    const roundedPayable  = Math.round(totalTaxPayable / 10) * 10;
    
    const totalPrepaid = formData.prepaidTaxes.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const netTaxDue    = Math.max(0, roundedPayable - totalPrepaid);

    return {
      totalTurnover,
      deemedECS, deemedCash, deemedNonDigital,
      totalDeemedProfit,
      profitECS, profitCash,
      ecsPct, cashPct,
      businessIncome,
      netProfitPct,
      otherSourcesTotal,
      grossTotalIncome,
      totalIncome,
      roundedIncome,
      tax, rebate,
      fee234F,
      totalTaxPayable,
      roundedPayable,
      totalPrepaid,
      netTaxDue,
    };
  };

  const comp = calculateComputation();

  // JSON Import Logic
  const handleJsonUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        processItrJson(json);
        toast.success('Details imported successfully!');
      } catch (err) {
        console.error('Error parsing JSON:', err);
        toast.error('Invalid JSON file');
      } finally {
        event.target.value = null; // Important to allow re-uploading the same file
      }
    };
    reader.readAsText(file);
  };

  // ── PDF (ITR Acknowledgment) Upload ──────────────────────────────────────
  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const toastId = toast.loading('PDF parse ho raha hai...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + '\n';
      }
      console.log('=== ITR FORM PDF RAW TEXT ===');
      console.log(fullText);
      parsePdfText(fullText);
      toast.success('ITR Form PDF se data import ho gaya!', { id: toastId });
    } catch (err) {
      console.error('PDF parse error:', err);
      toast.error('PDF parse nahi ho saka: ' + err.message, { id: toastId });
    } finally {
      event.target.value = null;
    }
  };

  // ── ITR-V Acknowledgment PDF Upload ───────────────────────────────────────
  const handleAckPdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const toastId = toast.loading('Acknowledgment parse ho raha hai...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page    = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + '\n';
      }
      console.log('=== ITR-V ACKNOWLEDGMENT RAW TEXT ===');
      console.log(fullText);
      parseAckText(fullText);
      toast.success('Acknowledgment import ho gaya!', { id: toastId });
    } catch (err) {
      console.error('Ack PDF error:', err);
      toast.error('Acknowledgment parse nahi ho saka: ' + err.message, { id: toastId });
    } finally {
      event.target.value = null;
    }
  };

  // ── ITR-V Acknowledgment Parser ──────────────────────────────────────────
  const parseAckText = (rawText) => {
    // Normalize: collapse whitespace
    const t = rawText.replace(/\s+/g, ' ').trim();
    console.log('[ACK] normalized text:', t);

    // Simple helpers
    const str = (pat) => { const m = t.match(pat); return m && m[1] ? m[1].trim() : ''; };
    // num: first match, group 1 must be the NUMBER
    const num = (pat) => { const m = t.match(pat); return m && m[1] ? parseFloat(m[1].replace(/,/g,'')) || 0 : 0; };

    // ── PAN ─────────────────────────────────────────────────────────────────
    const pan = str(/\b([A-Z]{5}\d{4}[A-Z])\b/);

    // ── Assessment Year ──────────────────────────────────────────────────────
    // Format: "Assessment Year 2025-26"
    const aY = str(/Assessment\s+Year\s+(\d{4}-\d{2,4})/i)
            || str(/A\.?Y\.?\s*[:\-]\s*(\d{4}-\d{2,4})/i);



    // ── DOB, Aadhaar, Mobile, Email ───────────────────────────────────────────
    const dob     = str(/Date\s+of\s+Birth\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
    const aadhaar = str(/Aadhaar\s*(?:Number|No\.?)?\s*[:\-]?\s*(\d[\dxX ]{10,14}\d)/i);
    const mobile  = str(/Mobile\s*(?:No\.?)?\s*[:\-]?\s*(\d{10})/i);
    const email   = str(/E-?mail\s*(?:ID|Address)?\s*[:\-]?\s*([\w.\-]+@[\w.\-]+\.[a-z]{2,})/i);
    const status  = str(/\bStatus\s+(Individual|HUF|Firm|Company|AOP|BOI)\b/i);
    // ── Income figures from ITR-V Acknowledgment (Super Flexible) ────────────
    // Problems fixed: Picking up serial numbers (1, 3, 4, 7) instead of amounts.
    // We look for the FIRST large number or the number after the label sequence.
    
    const getAmountAfter = (labelPat) => {
      const match = t.match(new RegExp(labelPat.source + '[^\\d]*(\\d[\\d,]+)', 'i'));
      if (match) {
        // If it picked up a single digit (like 1, 3, 4) and there's a larger number right after it, take the larger one
        const val = match[1].replace(/,/g, '');
        if (val.length <= 2) { // Probably a serial number
           const rest = t.slice(match.index + match[0].length);
           const betterMatch = rest.match(/(\d[\d,]{3,12})/); // Look for at least 3 digits
           if (betterMatch) return parseFloat(betterMatch[1].replace(/,/g, '')) || 0;
        }
        return parseFloat(val) || 0;
      }
      return 0;
    };

    const grossTotalIncome = getAmountAfter(/Gross\s+Total\s+Income/i) || num(/1\s+Gross\s+total\s+income\s+([\d,]{3,15})/i);
    const totalIncome      = getAmountAfter(/Total\s+Income/i) || num(/3\s+Total\s+income\s+([\d,]{3,15})/i);
    const taxPayable       = getAmountAfter(/Net\s+Tax\s+Payable/i) || num(/4\s+Net\s+tax\s+payable\s+([\d,]+)/i);
    const totalTaxesPaid   = getAmountAfter(/Taxes\s+Paid/i) || num(/7\s+Taxes\s+paid\s+([\d,]+)/i);
    
    const selfAssmtTax     = num(/Self[- ]?Assessment\s+Tax\s+([\d,]+)/i) || num(/\(140\)\s+([\d,]+)/i);
    const advanceTax       = num(/Advance\s+Tax\s+([\d,]+)/i) || num(/\(140A\)\s+([\d,]+)/i);
    const tdsPaid          = num(/TDS\s+([\d,]+)/i);
    const fee234F          = num(/234F\s+([\d,]+)/i) || getAmountAfter(/Fee\s+for\s+default/i);

    // ── Name & Father Name Fix ──────────────────────────────────────────────
    const name = str(/Name\s*[:\-]?\s*([A-Z][A-Z\s]{2,60}?)[\s\n\r]+(?:PAN|Father|Assessment)/i)
              || str(/Taxpayer\s+Name\s*[:\-]?\s*([A-Z][A-Z\s]{2,60}?)\s/i)
              || str(/Name\s+([A-Z][A-Z\s]{2,60}?)\s+PAN/i)
              || str(/I,\s+([A-Z][A-Z\s]{2,60}?)\s/i); // Fallback for verification section
    
    const fatherName = str(/(?:S\/O|D\/O|W\/O|Father's\s+Name|Son\s+of|daughter\s+of)\s*[:\-]?\s*([A-Z][A-Z\s]{2,60}?)[\s]+(?:Address|PAN|DOB|Date)/i);

    // ── Challans ─────────────────────────────────────────────────────────────
    const challanRows = [];
    let m;
    const c1 = /BSR\s+(\d{7})\s+(?:Date\s+)?(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(?:(?:Challan|Sl\.?No\.?)\s+)?(\d+)\s+(?:Amount\s+)?([\d,]+)/gi;
    const c2 = /(\d{7})\s+(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(\d{1,7})\s+([\d,]+)/g;
    while ((m = c1.exec(t)) !== null)
      challanRows.push({ bsrCode: m[1], date: m[2], challanNo: m[3], bank: '', amount: parseFloat(m[4].replace(/,/g,''))||0 });
    if (challanRows.length === 0)
      while ((m = c2.exec(t)) !== null)
        challanRows.push({ bsrCode: m[1], date: m[2], challanNo: m[3], bank: '', amount: parseFloat(m[4].replace(/,/g,''))||0 });

    // ── Bank Accounts ─────────────────────────────────────────────────────────
    const bankRows = [];
    const b1 = /([A-Z]{4}0[A-Z0-9]{6})\s+([A-Z][A-Z ]{3,50}?)\s+(\d{9,18})\s+(Savings?|Current|SB|CA)/gi;
    const b2 = /(\d{9,18})\s+([A-Z]{4}0[A-Z0-9]{6})/g;
    while ((m = b1.exec(t)) !== null) bankRows.push({ ifsc: m[1], name: m[2].trim(), accNo: m[3], type: m[4], nominate: 'No' });
    if (bankRows.length === 0)
      while ((m = b2.exec(t)) !== null) bankRows.push({ accNo: m[1], ifsc: m[2], name: '', type: 'Saving', nominate: 'No' });

    // ── Debug ─────────────────────────────────────────────────────────────────
    const parsed = { pan, aY, name, fatherName, dob, aadhaar, mobile, email, status,
      grossTotalIncome, totalIncome, taxPayable, selfAssmtTax, advanceTax, tdsPaid, totalTaxesPaid, fee234F,
      challanRows, bankRows };
    console.log('[ACK] parsed:', parsed);

    setDebugInfo(prev => ({
      ...(prev || {}),
      ackRawText: t,
      ackParsed: parsed
    }));
    setAckParsed(true);

    // ── Merge into formData ─────────────────────────────────────────────────
    const netProfitFromAck = totalIncome || grossTotalIncome;

    setFormData(prev => ({
      ...prev,
      assesseeName:    name            || prev.assesseeName,
      fatherName:      fatherName      || prev.fatherName,
      pan:             pan             || prev.pan,
      dob:             dob             || prev.dob,
      aadhaar:         aadhaar         || prev.aadhaar,
      mobile:          mobile          || prev.mobile,
      email:           email           || prev.email,
      status:          status          || prev.status,
      assessmentYear:  aY              || prev.assessmentYear,
      fee234F:         fee234F         || prev.fee234F,
      manualNetProfit: netProfitFromAck || prev.manualNetProfit,
      banks:        bankRows.length    > 0 ? bankRows    : prev.banks,
      prepaidTaxes: challanRows.length > 0 ? challanRows : prev.prepaidTaxes,
    }));
  };

  const numFromText = (text, ...patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const raw = (match[1] || match[0]).replace(/,/g, '').trim();
        const n = parseFloat(raw);
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return 0;
  };

  const strFromText = (text, ...patterns) => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) return match[1].trim();
    }
    return '';
  };

  const parsePdfText = (rawText) => {
    const t = rawText.replace(/\s+/g, ' ');

    const num = (pat) => {
      const m = t.match(pat);
      return m && m[1] ? parseFloat(m[1].replace(/,/g, '')) || 0 : 0;
    };
    const str = (pat) => {
      const m = t.match(pat);
      return m && m[1] ? m[1].trim() : '';
    };

    // ── Assessment Year ──────────────────────────────────────────────────────
    const aY = str(/Assessment Year\s+(\d{4}-\d{2,4})/i)
            || str(/A\.?Y\.?\s*[:\-]?\s*(\d{4}-\d{2,4})/i);

    // ── Names (ITR-4 A1/A2/A3) ───────────────────────────────────────────────
    const firstName = str(/\(A1\)\s+First Name\s+([A-Z][A-Z]*)\s+\(A/);
    const midName   = str(/\(A2\)\s+Middle Name\s+([A-Z][A-Z ]*)\s+\(A3\)/);
    const lastName  = str(/\(A3\)\s+Last Name\s+([A-Z][A-Z ]*)\s+\(A4\)/);
    const name = [firstName, midName, lastName].filter(Boolean).join(' ').trim()
              || str(/I,\s+([A-Z][A-Z ]+?)\s+son/);

    // ── PAN (A4) ─────────────────────────────────────────────────────────────
    const pan = str(/\(A4\)\s+Permanent Account Number\s+([A-Z]{5}\d{4}[A-Z])/i)
             || str(/PAN\s*[:\-]?\s*([A-Z]{5}\d{4}[A-Z])/i);

    // ── DOB (A5) ─────────────────────────────────────────────────────────────
    const dob = str(/\(A5\)[^\d]*(\d{2}\/\d{2}\/\d{4})/);

    // ── Address (A6-A13) ─────────────────────────────────────────────────────
    const flatNo   = str(/\(A6\)\s+Flat[^\(]*?\s+([^\(]+?)\s+\(A7\)/);
    const premises = str(/\(A7\)\s+Name of Premises[^\(]*?\s+([^\(]+?)\s+\(A8\)/);
    const road     = str(/\(A8\)\s+Road[^\(]*?\s+([^\(]+?)\s+\(A9\)/);
    const area     = str(/\(A9\)\s+Area[^\(]*?\s+([^\(]+?)\s+\(A10\)/);
    const city     = str(/\(A10\)\s+Town[^\(]*?\s+([^\(]+?)\s+\(A11\)/);
    const state    = str(/\(A11\)\s+State\s+([^\(]+?)\s+\(A12\)/);
    const pincode  = str(/\(A13\)\s+PIN[^\d]*(\d{6})/);
    const address  = [flatNo, premises, road, area, city, state, pincode].filter(Boolean).join(', ').trim();

    // ── Aadhaar (A14) ────────────────────────────────────────────────────────
    const aadhaar = str(/\(A14\)\s+Aadhaar Number[^\d]*(\d[\dxX ]{10,14}\d)/i)
                 || str(/Aadhaar[^0-9]*(\d[\dxX ]{10,14}\d)/i);

    // ── Status (A15) ─────────────────────────────────────────────────────────
    const status = str(/\(A15\)\s+Status\s+(Individual|HUF|Firm|Company)/i)
                || str(/Status\s+(Individual|HUF|Firm|Company)/i);

    // ── Mobile (A16) ─────────────────────────────────────────────────────────
    const mobile = str(/\(A16\)[^\d]*(\d{10})/)
                || str(/Mobile[^\d]*(\d{10})/);

    // ── Email (A18) ──────────────────────────────────────────────────────────
    const email = str(/\(A18\)[^\s@]*\s+([\w.\-]+@[\w.\-]+\.[a-z]{2,})/i)
               || str(/Email[^\s@]*\s+([\w.\-]+@[\w.\-]+\.[a-z]{2,})/i);

    // ── Father's Name (Verification section) ─────────────────────────────────
    const fatherName = str(/son of\s+([A-Z][A-Z ]+?)(?:\s+(?:in|daughter|capacity|wife|Place))/i)
                    || str(/daughter of\s+([A-Z][A-Z ]+?)(?:\s+(?:in|capacity|Place))/i);

    // ── Nature of Business ───────────────────────────────────────────────────
    const natureOfBusiness = str(/\d{5}-(.+?)(?:\s+E1|\s+Gross)/);

    // ── Schedule BP 44AD — E1a/b/c, E2 ──────────────────────────────────────
    // Fixed: E2 was picking up "44" from "section 44AD". 
    // Now specifically targeting E2a, E2b, E2c and skipping "44AD".
    
    const turnoverECS   = num(/E1a\b[^\d]*(\d[\d,]{3,15})/i)
                       || num(/Through bank[^\/]*\/ECS[^\d]*(\d[\d,]{3,15})/i);

    const turnoverCash  = num(/E1b\b[^\d]*(\d[\d,]{3,15})/i)
                       || num(/Receipts in Cash[^\d]*(\d[\d,]{3,15})/i);

    const turnoverOther = num(/E1c\b[^\d]*(\d[\d,]{3,15})/i)
                       || num(/Any mode other[^\d]*(\d[\d,]{3,15})/i);

    // E2a is Profit from Bank/ECS, E2b is Profit from Cash/Other, E2c is Total
    const manualProfitECS  = num(/E2a\b[^\d]*(\d[\d,]{3,15})/i);
    const manualProfitCash = num(/E2b\b[^\d]*(\d[\d,]{3,15})/i);

    // E2c is the Total (a + b) — this is the actual Net Profit
    const netProfit44AD = num(/E2c\b[^\d]*(\d[\d,]{3,15})/i) 
                       || num(/Total\s*\(a\s*\+\s*b\)\s*E2c\s*(\d[\d,]+)/i)
                       || num(/E2\b(?:(?!\b44AD\b).)*?(\d[\d,]{3,15})/i); // Skip if 44AD is the match
    
    const grossTurnover44AD = num(/E1\)\s+Gross[^\d]*(\d[\d,]{3,15})/i)
                           || num(/Gross Turnover or Gross Receipts[^\d]*(\d[\d,]{3,15})/i);

    // ── Part B — Other Sources ───────────────────────────────────────────────
    const savInt  = num(/Interest from Saving Account[^\d]*(\d[\d,]+)/i)
                 || num(/Interest.*?Saving Bank[^\d]*(\d[\d,]+)/i);

    const divInc  = num(/(?:^|\s)Dividend[^\d]*(\d[\d,]+)/i);

    const fdInt   = num(/Interest from Deposit[^\d]*(\d[\d,]+)/i)
                 || num(/(?:FDR|Fixed Deposit|Term Deposit)[^\d]*(\d[\d,]+)/i);

    // ── Part D — Fee 234F ────────────────────────────────────────────────────
    const fee234F = num(/(?:D11\b|Fee u\/s 234F)[^\d]*(\d[\d,]+)/i)
                 || num(/234F[^\d]*(\d[\d,]+)/i);

    // ── Schedule IT — Challans ───────────────────────────────────────────────
    // "BSR 0510002 Date 14/12/2025 Challan 26887 Amount 5,000"
    const challanRows = [];
    let m;
    const itrChPat = /BSR\s+(\d{7})\s+Date\s+(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+Challan\s+(\d+)\s+Amount\s+([\d,]+)/gi;
    const fallbackChPat = /(\d{7})\s+(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(\d{1,6})\s+([\d,]+)/g;
    while ((m = itrChPat.exec(t)) !== null) {
      challanRows.push({ bsrCode: m[1], date: m[2], challanNo: m[3], bank: '', amount: parseFloat(m[4].replace(/,/g, '')) || 0 });
    }
    if (challanRows.length === 0) {
      while ((m = fallbackChPat.exec(t)) !== null) {
        challanRows.push({ bsrCode: m[1], date: m[2], challanNo: m[3], bank: '', amount: parseFloat(m[4].replace(/,/g, '')) || 0 });
      }
    }

    // ── Schedule BA / D21 — Bank Accounts ────────────────────────────────────
    // "KKBK0005294 KOTAK MAHINDRA BANK LIMITED 5646190832 Savings Account"
    const bankRows = [];
    const bankPat  = /([A-Z]{4}0[A-Z0-9]{6})\s+([A-Z][A-Z ]{3,50}?)\s+(\d{9,18})\s+(Savings?|Current|SB|CA)/gi;
    const bankPat2 = /(\d{9,18})\s+([A-Z]{4}0[A-Z0-9]{6})/g;
    while ((m = bankPat.exec(t)) !== null) {
      bankRows.push({ ifsc: m[1], name: m[2].trim(), accNo: m[3], type: m[4], nominate: 'No' });
    }
    if (bankRows.length === 0) {
      while ((m = bankPat2.exec(t)) !== null) {
        bankRows.push({ accNo: m[1], ifsc: m[2], name: '', type: 'Saving', nominate: 'No' });
      }
    }

    // ── Debug ────────────────────────────────────────────────────────────────
    setDebugInfo(prev => ({
      ...(prev || {}),
      pdfRawText: t,
      pdfParsed: {
        name, pan, aY, dob, status, mobile, email, aadhaar, address, fatherName, natureOfBusiness,
        turnoverECS, turnoverCash, turnoverOther, grossTurnover44AD, netProfit44AD,
        savInt, fdInt, divInc, fee234F,
        challanRows, bankRows
      }
    }));
    setPdfParsed(true);

    // ── Merge into formData ───────────────────────────────────────────────────
    setFormData(prev => ({
      ...prev,
      assesseeName:       name              || prev.assesseeName,
      fatherName:         fatherName        || prev.fatherName,
      pan:                pan               || prev.pan,
      dob:                dob               || prev.dob,
      aadhaar:            aadhaar           || prev.aadhaar,
      mobile:             mobile            || prev.mobile,
      email:              email             || prev.email,
      address:            address           || prev.address,
      status:             status            || prev.status,
      assessmentYear:     aY                || prev.assessmentYear,
      tradeName:          name              || prev.tradeName,
      natureOfBusiness:   natureOfBusiness  || prev.natureOfBusiness,

      // 44AD fields:
      // E1a = Bank/ECS, E1b = Cash, E1c = Any other mode (mapped to NonDigital)
      turnoverECS:        turnoverECS       || prev.turnoverECS,
      turnoverCash:       turnoverCash      || prev.turnoverCash,
      turnoverNonDigital: turnoverOther     || prev.turnoverNonDigital,
      manualNetProfit:    netProfit44AD     || prev.manualNetProfit,
      manualProfitECS:    manualProfitECS   || prev.manualProfitECS,
      manualProfitCash:   manualProfitCash  || prev.manualProfitCash,

      savingInterest:     savInt            || prev.savingInterest,
      fdInterest:         fdInt             || prev.fdInterest,
      dividendIncome:     divInc            || prev.dividendIncome,

      fee234F:            fee234F           || prev.fee234F,

      banks:        bankRows.length > 0    ? bankRows    : prev.banks,
      prepaidTaxes: challanRows.length > 0 ? challanRows : prev.prepaidTaxes,
    }));
  };

  const processItrJson = (data) => {
    let flatFields = {};
    let bankAccounts = [];
    let prepaidTaxes = [];
    
    // Deep recursive search to find ALL keys regardless of nesting
    const traverse = (node, path = '') => {
      if (node === null || node === undefined) return;
      
      if (Array.isArray(node)) {
         node.forEach((item, index) => traverse(item, `${path}[${index}]`));
         return;
      }
      
      if (typeof node === 'object') {
          // Detect single object or array entries for Banks and Taxes
          if (('BankName' in node && 'IFSCCode' in node) || ('BankAccountNo' in node)) {
              if (!bankAccounts.some(b => b.BankAccountNo === node.BankAccountNo && b.IFSCCode === node.IFSCCode)) {
                  bankAccounts.push(node);
              }
          }
          if (('BSRCode' in node && ('SrlNoOfChaln' in node || 'ChallanNo' in node || 'SrlNoOfChallan' in node)) || 'TotTDSDeclared' in node || 'AmtUs140A' in node) {
              if (!prepaidTaxes.some(t => t.BSRCode === node.BSRCode && (t.SrlNoOfChaln === node.SrlNoOfChaln || t.ChallanNo === node.ChallanNo))) {
                  prepaidTaxes.push(node);
              }
          }

          for (const [key, value] of Object.entries(node)) {
             // Special case for AssesseeName if it's an object
             if (key.toLowerCase() === 'assesseename' && typeof value === 'object' && value !== null) {
                 flatFields['AssesseeNameObj'] = [value];
             }
             traverse(value, `${path}.${key}`);
          }
          return;
      }
      
      // Store primitive values
      const keyName = path.split('.').pop().toLowerCase();
      if (!flatFields[keyName]) flatFields[keyName] = [];
      flatFields[keyName].push(node);
    };
    
    // Start traversal
    traverse(data.ITR || data);

    // Save debug info for inspection
    setDebugInfo({
      flatFields,
      bankAccounts: JSON.parse(JSON.stringify(bankAccounts)),
      prepaidTaxes: JSON.parse(JSON.stringify(prepaidTaxes)),
      rawKeys: Object.keys(flatFields).sort()
    });
    console.log('=== ITR JSON DEBUG ===');
    console.log('All flat keys:', Object.keys(flatFields).sort());
    console.log('flatFields:', flatFields);
    console.log('bankAccounts detected:', bankAccounts);
    console.log('prepaidTaxes detected:', prepaidTaxes);

    // Helper to get first available valid value from possible key names (Case Insensitive)
    const getVal = (...keys) => {
        for (let k of keys) {
            k = k.toLowerCase();
            if (flatFields[k] && flatFields[k].length > 0) {
               const val = flatFields[k].find(v => v !== null && v !== '');
               if (val !== undefined) return val;
            }
        }
        return '';
    };

    const getNum = (...keys) => parseFloat(getVal(...keys)) || 0;

    // Names
    let aName = '';
    if (flatFields['AssesseeNameObj'] && flatFields['AssesseeNameObj'].length > 0) {
        const obj = flatFields['AssesseeNameObj'][0];
        aName = [obj.FirstName, obj.MiddleName, obj.SurNameOrOrgName || obj.LastName].filter(Boolean).join(' ').trim();
    }
    if (!aName) aName = getVal('FirstName', 'SurNameOrOrgName', 'AssesseeName');
    
    let fName = getVal('FatherName', 'Father_Name', 'FatherNameSection');
    
    // Address
    const addressDetails = [
       getVal('ResidenceNo', 'FlatDoorBlock'),
       getVal('ResidenceName', 'BuildingVillage'),
       getVal('RoadStreet', 'RoadStreetPost'),
       getVal('LocalityArea', 'AreaLocality'),
       getVal('CityTownDistrict', 'TownCityDistrict'),
       getVal('StateCode', 'State'),
       getVal('PinCode')
    ].filter(Boolean).join(', ').trim();

    // 44AD Gross Receipts & Profit
    const turnoverECS = getNum('GrsTrnOverBank', 'AcPyeeChqDDNEFTrtgsOrEcs', 'GrossReceipts_Digital', 'GrossReceiptsECS', 'GrossReceiptsDigital');
    const turnoverCash = getNum('GrsTrnOverAnyOthMode', 'AnyOtherMode', 'GrossReceiptsAnyOtherMode', 'GrossReceipts_NonDigital', 'GrossReceiptsOtherMode', 'GrossReceiptsCash', 'GrossReceipts', 'TrnOvrAnyOthMod', 'TurnoverAnyOther');
    
    const incBank = getNum('IncChargableInstBuss');
    const incCash = getNum('IncChargableInstBussOther');
    let manualNetProfit = incBank + incCash;
    if (manualNetProfit === 0) {
         manualNetProfit = getNum('NetProfit_Total', 'PresumptiveInc44AD', 'TotalPersumptiveInc44AD', 'NetProfit', 'ProfitAmount', 'TotalNetProfit', 'IncFromBusiness');
    }
    
    // Interest and Others
    const svgInt = getNum('SavBank', 'SavingBank', 'SavingInterest', 'InterestSavingBank', 'IntSavingBank', 'InterestFromSavingBank');
    const fdInt = getNum('TermDep', 'DepositInBank', 'IntOnDep', 'TermDeposit', 'FdInterest', 'InterestDeposits', 'IntDeposits', 'InterestOnFDR');
    const divInc = getNum('DividendIncome', 'Dividend', 'Dividends', 'DividendInc');

    const fee234F = getNum('FeeUs234F', 'LateFilingFee234F', 'TotalFee234F', 'Fee234F', 'LatePurchasingFee234F', 'FeeUnder234F', 'FeeUnderSec234F');
    
    let aYear = getVal('AssessmentYear');
    if (aYear && aYear.length === 4) {
        aYear = `${aYear}-${parseInt(aYear) + 1}`;
    }

    // Process Arrays
    const formattedBanks = bankAccounts.map(b => ({
        name: b.BankName || b.NameOfBank || '',
        accNo: b.BankAccountNo || b.AccountNo || '',
        ifsc: b.IFSCCode || b.IFSC || '',
        type: b.AccountType || b.Type || 'Saving',
        prevalidated: b.Prevalidated || 'No',
        nominate: b.NominateForRefund || b.RefundAccount || 'No'
    }));

    const formattedTaxes = prepaidTaxes.filter(t => t.BSRCode || t.ChallanNo || t.SrlNoOfChaln || t.Amount || t.Amt).map(t => ({
        bsrCode: t.BSRCode || '',
        date: t.DateOfDeposit || t.DateDep || t.Date || '',
        challanNo: t.ChallanNo || t.SrlNoOfChaln || t.SrlNoOfChallan || '',
        bank: t.BankName || '',
        amount: parseFloat(t.Amt) || parseFloat(t.Amount) || parseFloat(t.TotTDSDeclared) || parseFloat(t.AmtUs140A) || 0
    }));

    // Update state purely from JSON
    setFormData(prev => ({
       ...prev,
       assesseeName: aName || prev.assesseeName,
       fatherName: fName || prev.fatherName,
       pan: getVal('PAN') || prev.pan,
       dob: getVal('DOB') || prev.dob,
       aadhaar: getVal('AadhaarCardNo') || prev.aadhaar,
       mobile: getVal('MobileNo', 'MobileNumber') || prev.mobile,
       email: getVal('EmailAddr', 'EmailAddress') || prev.email,
       address: addressDetails || prev.address,
       tradeName: getVal('TradeName', 'BusinessName') || aName || prev.tradeName,
       status: getVal('Status') || prev.status,
       assessmentYear: aYear || prev.assessmentYear,
       
       turnoverECS: turnoverECS || prev.turnoverECS,
       turnoverNonDigital: turnoverCash || prev.turnoverNonDigital, // Map OtherMode/Cash to NonDigital
       manualNetProfit: manualNetProfit || prev.manualNetProfit,
       manualProfitECS: incBank || prev.manualProfitECS,
       manualProfitCash: incCash || prev.manualProfitCash,
       
       savingInterest: svgInt || prev.savingInterest,
       fdInterest: fdInt || prev.fdInterest,
       dividendIncome: divInc || prev.dividendIncome,
       
       fee234F: fee234F || prev.fee234F,
       
       banks: formattedBanks.length > 0 ? formattedBanks : prev.banks,
       prepaidTaxes: formattedTaxes.length > 0 ? formattedTaxes : prev.prepaidTaxes
    }));
    setIsJsonParsed(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleArrayChange = (index, arrayName, field, value) => {
    const updatedArray = [...formData[arrayName]];
    updatedArray[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setFormData(prev => ({ ...prev, [arrayName]: updatedArray }));
  };

  const addItem = (arrayName, emptyObj) => {
    setFormData(prev => ({ ...prev, [arrayName]: [...prev[arrayName], emptyObj] }));
  };

  const removeItem = (arrayName, index) => {
    if (formData[arrayName].length > 1) {
      setFormData(prev => ({ ...prev, [arrayName]: formData[arrayName].filter((_, i) => i !== index) }));
    }
  };

  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN').format(amt);

  return (
    <div className="page-container">
      <div className="page-header no-print">
        <div>
          <h1>ITR Computation</h1>
          <p>Import JSON and generate professional computation sheets</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => window.print()}>
            <FiPrinter /> Print Sheet
          </button>
        </div>
      </div>

      <div className="itr-tabs no-print">
        <div className={`itr-tab ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>Editor</div>
        <div className={`itr-tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Computation Sheet</div>
        <div className={`itr-tab ${activeTab === 'debug' ? 'active' : ''}`} onClick={() => setActiveTab('debug')} style={{color: 'orange'}}>🔍 Debug</div>
      </div>

      {activeTab === 'debug' && (
        <div className="no-print itr-container" style={{fontFamily:'monospace', fontSize:'0.82rem'}}>
          {!debugInfo ? (
            <div className="itr-card" style={{textAlign:'center', color:'var(--text-muted)'}}>
              <p>⬆️ Pehle JSON ya PDF upload karo — phir yahan sab data dikhega.</p>
            </div>
          ) : (
            <>
              {/* PDF Parsed Results */}
              {debugInfo.pdfParsed && (
                <div className="itr-card">
                  <h3 className="itr-section-title" style={{color:'#4caf50'}}>📄 PDF se Parsed Data</h3>
                  <table className="form-table">
                    <thead><tr><th>Field</th><th>Value (from PDF)</th></tr></thead>
                    <tbody>
                      {Object.entries(debugInfo.pdfParsed).map(([k, v]) =>
                        typeof v !== 'object' ? (
                          <tr key={k} style={{background: v && v !== 0 ? '' : 'rgba(255,0,0,0.05)'}}>
                            <td style={{fontWeight:'bold', color:'var(--accent)'}}>{k}</td>
                            <td>{String(v)}</td>
                          </tr>
                        ) : null
                      )}
                    </tbody>
                  </table>
                  {debugInfo.pdfParsed.challanRows?.length > 0 && (
                    <><h4 style={{margin:'12px 0 6px'}}>Challans Detected</h4>
                    <table className="form-table">
                      <thead><tr><th>BSR</th><th>Date</th><th>Challan</th><th>Amount</th></tr></thead>
                      <tbody>{debugInfo.pdfParsed.challanRows.map((c,i) => <tr key={i}><td>{c.bsrCode}</td><td>{c.date}</td><td>{c.challanNo}</td><td>{c.amount}</td></tr>)}</tbody>
                    </table></>
                  )}
                  {debugInfo.pdfParsed.bankRows?.length > 0 && (
                    <><h4 style={{margin:'12px 0 6px'}}>Banks Detected</h4>
                    <table className="form-table">
                      <thead><tr><th>Acc No</th><th>IFSC</th><th>Name</th><th>Type</th></tr></thead>
                      <tbody>{debugInfo.pdfParsed.bankRows.map((b,i) => <tr key={i}><td>{b.accNo}</td><td>{b.ifsc}</td><td>{b.name}</td><td>{b.type}</td></tr>)}</tbody>
                    </table></>
                  )}
                  {debugInfo.pdfRawText && (
                    <details style={{marginTop:'12px'}}>
                      <summary style={{cursor:'pointer', color:'var(--accent)'}}>📜 Raw PDF Text (click to expand)</summary>
                      <pre style={{fontSize:'0.7rem', whiteSpace:'pre-wrap', maxHeight:'300px', overflow:'auto', background:'var(--bg-secondary)', padding:'10px', marginTop:'8px'}}>{debugInfo.pdfRawText}</pre>
                    </details>
                  )}
                </div>
              )}

              {/* JSON Banks */}
              {debugInfo.bankAccounts && (
                <div className="itr-card">
                  <h3 className="itr-section-title" style={{color:'orange'}}>📦 JSON se nikle BANKS ({debugInfo.bankAccounts.length} found)</h3>
                  {debugInfo.bankAccounts.length === 0 ? <p style={{color:'red'}}>❌ Koi bank detect nahi hua!</p> : (
                    <table className="form-table">
                      <thead><tr><th>Key</th><th>Value</th></tr></thead>
                      <tbody>
                        {debugInfo.bankAccounts.map((b, i) => (
                          <React.Fragment key={i}>
                            <tr><td colSpan={2} style={{background:'var(--bg-secondary)', fontWeight:'bold'}}>Bank #{i+1}</td></tr>
                            {Object.entries(b).map(([k,v]) => (
                              <tr key={`${i}-${k}`}><td style={{color:'var(--text-muted)'}}>{k}</td><td>{String(v)}</td></tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* JSON Challans */}
              {debugInfo.prepaidTaxes && (
                <div className="itr-card">
                  <h3 className="itr-section-title" style={{color:'orange'}}>💰 JSON se nikle CHALLANS ({debugInfo.prepaidTaxes.length} found)</h3>
                  {debugInfo.prepaidTaxes.length === 0 ? <p style={{color:'red'}}>❌ Koi challan detect nahi hua!</p> : (
                    <table className="form-table">
                      <tbody>
                        {debugInfo.prepaidTaxes.map((t, i) => (
                          <React.Fragment key={i}>
                            <tr><td colSpan={2} style={{background:'var(--bg-secondary)', fontWeight:'bold'}}>Challan #{i+1}</td></tr>
                            {Object.entries(t).map(([k,v]) => (
                              <tr key={`${i}-${k}`}><td style={{color:'var(--text-muted)'}}>{k}</td><td>{String(v)}</td></tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* JSON All Keys */}
              {debugInfo.rawKeys && (
                <div className="itr-card">
                  <h3 className="itr-section-title" style={{color:'orange'}}>🗝️ Saare JSON Keys ({debugInfo.rawKeys.length} total)</h3>
                  <table className="form-table">
                    <thead><tr><th>Key</th><th>Values</th></tr></thead>
                    <tbody>
                      {debugInfo.rawKeys.map(k => (
                        <tr key={k} style={{background: debugInfo.flatFields[k]?.some(v => v && v !== 0) ? '' : 'rgba(255,0,0,0.05)'}}>
                          <td style={{fontWeight:'bold', color:'var(--accent)'}}>{k}</td>
                          <td>{JSON.stringify(debugInfo.flatFields[k])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'form' ? (
        <div className="no-print">
            {/* ── Upload Bar ── */}
            <div style={{display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap'}}>

              {/* 1. JSON Upload */}
              <div className="import-btn-container" style={{flex:1, minWidth:'180px', cursor:'pointer', position:'relative', borderColor: isJsonParsed ? '#4caf50' : ''}} onClick={() => fileInputRef.current.click()}>
                <input type="file" ref={fileInputRef} onChange={handleJsonUpload} style={{display:'none'}} accept=".json" />
                {isJsonParsed && (
                  <button onClick={(e) => { e.stopPropagation(); setIsJsonParsed(false); }} style={{position:'absolute', top:'5px', right:'5px', background:'none', border:'none', color:'#d32f2f', cursor:'pointer'}} title="Remove"><FiTrash2 size={14}/></button>
                )}
                <div style={{textAlign:'center'}}>
                  <FiUploadCloud size={32} color={isJsonParsed ? '#4caf50' : 'var(--accent)'} />
                  <h3 style={{marginTop:'6px', fontSize:'0.95rem'}}>{isJsonParsed ? '✅ JSON Imported' : '1️⃣ ITR JSON'}</h3>
                  <p className="card-subtitle" style={{fontSize:'0.75rem'}}>Official IT Dept JSON file<br/>(Max 44AD, Income, Tax data)</p>
                </div>
              </div>

              {/* 2. ITR Form PDF */}
              <div className="import-btn-container" style={{flex:1, minWidth:'180px', cursor:'pointer', position:'relative', borderColor: pdfParsed ? '#4caf50' : ''}} onClick={() => pdfInputRef.current.click()}>
                <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} style={{display:'none'}} accept=".pdf" />
                {pdfParsed && (
                  <button onClick={(e) => { e.stopPropagation(); setPdfParsed(false); }} style={{position:'absolute', top:'5px', right:'5px', background:'none', border:'none', color:'#d32f2f', cursor:'pointer'}} title="Remove"><FiTrash2 size={14}/></button>
                )}
                <div style={{textAlign:'center'}}>
                  <FiFileText size={32} color={pdfParsed ? '#4caf50' : 'var(--accent)'} />
                  <h3 style={{marginTop:'6px', fontSize:'0.95rem'}}>{pdfParsed ? '✅ Form Imported' : '2️⃣ ITR Form PDF'}</h3>
                  <p className="card-subtitle" style={{fontSize:'0.75rem'}}>Full ITR-4 PDF form<br/>(E1a/b/c, E2, Banks, Schedule)</p>
                </div>
              </div>

              {/* 3. ITR-V Acknowledgment PDF */}
              <div className="import-btn-container" style={{flex:1, minWidth:'180px', cursor:'pointer', position:'relative', borderColor: ackParsed ? '#4caf50' : ''}} onClick={() => ackPdfInputRef.current.click()}>
                <input type="file" ref={ackPdfInputRef} onChange={handleAckPdfUpload} style={{display:'none'}} accept=".pdf" />
                {ackParsed && (
                  <button onClick={(e) => { e.stopPropagation(); setAckParsed(false); }} style={{position:'absolute', top:'5px', right:'5px', background:'none', border:'none', color:'#d32f2f', cursor:'pointer'}} title="Remove"><FiTrash2 size={14}/></button>
                )}
                <div style={{textAlign:'center'}}>
                  <FiCheckCircle size={32} color={ackParsed ? '#4caf50' : 'var(--accent)'} />
                  <h3 style={{marginTop:'6px', fontSize:'0.95rem'}}>{ackParsed ? '✅ Receipt Imported' : '3️⃣ ITR-V Receipt PDF'}</h3>
                  <p className="card-subtitle" style={{fontSize:'0.75rem'}}>Acknowledgment / Receipt<br/>(Name, PAN, Challan, Bank)</p>
                </div>
              </div>

            </div>

          <div className="itr-container">
            <div className="itr-card">
              <h3 className="itr-section-title"><FiUser /> Personal & Filing Details</h3>
              <div className="itr-grid">
                <div className="form-group"><label className="form-label">Name of Assessee</label><input type="text" name="assesseeName" value={formData.assesseeName} onChange={handleInputChange} className="form-input" /></div>
                <div className="form-group"><label className="form-label">Father's Name</label><input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="form-input" /></div>
                <div className="form-group"><label className="form-label">PAN</label><input type="text" name="pan" value={formData.pan} onChange={handleInputChange} className="form-input" /></div>
                <div className="form-group"><label className="form-label">Aadhaar No</label><input type="text" name="aadhaar" value={formData.aadhaar} onChange={handleInputChange} className="form-input" /></div>
                <div className="form-group"><label className="form-label">Date of Birth</label><input type="text" name="dob" value={formData.dob} onChange={handleInputChange} className="form-input" placeholder="DD/MM/YYYY" /></div>
                <div className="form-group"><label className="form-label">Gender</label><select name="gender" value={formData.gender} onChange={handleInputChange} className="form-select"><option>Male</option><option>Female</option></select></div>
              </div>
            </div>

            <div className="itr-card">
              <h3 className="itr-section-title"><FiBriefcase /> Income u/s 44AD (Turnover & Profit Breakdown)</h3>
              <div className="itr-grid">
                <div className="form-group"><label className="form-label">ECS/Cheque/DD Mode (E1a)</label><input type="number" name="turnoverECS" value={formData.turnoverECS} onChange={handleInputChange} className="form-input" /></div>
                <div className="form-group"><label className="form-label">Profit from ECS Mode (E2a)</label><input type="number" name="manualProfitECS" value={formData.manualProfitECS} onChange={handleInputChange} className="form-input" style={{borderColor:'#4caf50'}} /></div>
                
                <div className="form-group"><label className="form-label">Cash/Other Mode (E1b+E1c)</label><input type="number" name="turnoverCash" value={formData.turnoverCash + formData.turnoverNonDigital} onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, turnoverCash: val, turnoverNonDigital: 0 }));
                }} className="form-input" /></div>
                <div className="form-group"><label className="form-label">Profit from Cash Mode (E2b)</label><input type="number" name="manualProfitCash" value={formData.manualProfitCash} onChange={handleInputChange} className="form-input" style={{borderColor:'#4caf50'}} /></div>
                
                <div className="form-group"><label className="form-label">Total Net Profit (E2c / Manual Override)</label><input type="number" name="manualNetProfit" value={formData.manualNetProfit} onChange={handleInputChange} className="form-input" style={{fontWeight:'bold', background:'#f9f9f9'}}/></div>
              </div>
            </div>

            <div className="itr-card">
              <div className="card-header"><h3 className="itr-section-title"><FiDollarSign /> Prepaid Taxes (Challans)</h3><button className="btn btn-sm btn-secondary" onClick={() => addItem('prepaidTaxes', { bsrCode: '', date: '', challanNo: '', bank: '', amount: 0 })}><FiPlus /> Add Challan</button></div>
              <table className="form-table">
                <thead><tr><th>BSR Code</th><th>Date</th><th>Challan No</th><th>Bank/Branch</th><th>Amount</th><th></th></tr></thead>
                <tbody>
                  {formData.prepaidTaxes.map((c, i) => (
                    <tr key={i}>
                      <td><input type="text" value={c.bsrCode} onChange={e => handleArrayChange(i, 'prepaidTaxes', 'bsrCode', e.target.value)} className="form-input" /></td>
                      <td><input type="text" value={c.date} onChange={e => handleArrayChange(i, 'prepaidTaxes', 'date', e.target.value)} className="form-input" /></td>
                      <td><input type="text" value={c.challanNo} onChange={e => handleArrayChange(i, 'prepaidTaxes', 'challanNo', e.target.value)} className="form-input" /></td>
                      <td><input type="text" value={c.bank} onChange={e => handleArrayChange(i, 'prepaidTaxes', 'bank', e.target.value)} className="form-input" /></td>
                      <td><input type="number" value={c.amount} onChange={e => handleArrayChange(i, 'prepaidTaxes', 'amount', e.target.value)} className="form-input" /></td>
                      <td><button className="btn btn-icon btn-danger" onClick={() => removeItem('prepaidTaxes', i)}><FiTrash2 /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="itr-card">
              <div className="card-header"><h3 className="itr-section-title"><FiHash /> Bank Details</h3><button className="btn btn-sm btn-secondary" onClick={() => addItem('banks', { name: '', accNo: '', ifsc: '', type: '', prevalidated: 'No', nominate: 'No' })}><FiPlus /> Add Bank</button></div>
              <table className="form-table">
                <thead><tr><th>Bank Name</th><th>Account No</th><th>IFSC</th><th>Type</th><th>Ref?</th><th></th></tr></thead>
                <tbody>
                  {formData.banks.map((b, i) => (
                    <tr key={i}>
                      <td><input type="text" value={b.name} onChange={e => handleArrayChange(i, 'banks', 'name', e.target.value)} className="form-input" /></td>
                      <td><input type="text" value={b.accNo} onChange={e => handleArrayChange(i, 'banks', 'accNo', e.target.value)} className="form-input" /></td>
                      <td><input type="text" value={b.ifsc} onChange={e => handleArrayChange(i, 'banks', 'ifsc', e.target.value)} className="form-input" /></td>
                      <td><input type="text" value={b.type} onChange={e => handleArrayChange(i, 'banks', 'type', e.target.value)} className="form-input" /></td>
                      <td><input type="text" value={b.nominate} onChange={e => handleArrayChange(i, 'banks', 'nominate', e.target.value)} style={{width: '40px'}} className="form-input" /></td>
                      <td><button className="btn btn-icon btn-danger" onClick={() => removeItem('banks', i)}><FiTrash2 /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Computation Sheet Preview */
        <div className="computation-sheet">
          <div className="comp-header-row">
             <span>Name of Assessee : {formData.assesseeName}</span>
             <span>A.Y. {formData.assessmentYear}</span>
             <span>PAN : {formData.pan}</span>
             <span>Code : {formData.compuTaxCode}</span>
          </div>

          <div className="comp-user-info">
             <div className="comp-info-label">Name of Assessee</div><div className="comp-info-value">{formData.assesseeName}</div>
             <div className="comp-info-label">Father's Name</div><div className="comp-info-value">{formData.fatherName}</div>
             <div className="comp-info-label">Address</div><div className="comp-info-value">{formData.address}</div>
             <div className="comp-info-label">Assessment Year</div><div className="comp-info-value">{formData.assessmentYear}</div>
             <div className="comp-info-label">Status</div><div className="comp-info-value">{formData.status}</div>
             <div className="comp-info-label">Year Ended</div><div className="comp-info-value">31.03.2025</div>
             <div className="comp-info-label">PAN</div><div className="comp-info-value">{formData.pan}</div>
             <div className="comp-info-label">Date of Birth</div><div className="comp-info-value">{formData.dob}</div>
             <div className="comp-info-label">Residential Status</div><div className="comp-info-value">{formData.resStatus}</div>
             <div className="comp-info-label">Gender</div><div className="comp-info-value">{formData.gender}</div>
             <div className="comp-info-label">Nature of Business</div><div className="comp-info-value" style={{gridColumn: 'span 3'}}>{formData.natureOfBusiness}, Trade Name:{formData.tradeName}</div>
          </div>

          <div className="comp-title-center">Computation of Total Income [As per Section 115BAC (New Tax Regime)]</div>
          
          <div className="comp-caution">
            Caution<br/>
            1. 26AS not imported<br/>
            2. AIS/TIS report not imported
          </div>

          <table className="comp-main-table">
            <thead><tr><th>PARTICULARS</th><th></th><th>AMOUNT</th></tr></thead>
            <tbody>
              <tr><td><strong>Income from Business or Profession (Chapter IV D)</strong></td><td></td><td className="comp-val-cell">{formatCurrency(comp.businessIncome)}</td></tr>
              <tr className="comp-sub-row"><td>Income u/s 44AD (Analysis):</td><td></td><td></td></tr>
              <tr className="comp-sub-row"><td style={{paddingLeft:'20px'}}>&bull; Bank/Digital Mode (E1a): {formatCurrency(formData.turnoverECS)} @ {comp.ecsPct}%</td><td>{formatCurrency(comp.profitECS)}</td><td></td></tr>
              <tr className="comp-sub-row"><td style={{paddingLeft:'20px'}}>&bull; Cash/Other Mode (E1b+c): {formatCurrency(formData.turnoverCash + formData.turnoverNonDigital)} @ {comp.cashPct}%</td><td>{formatCurrency(comp.profitCash)}</td><td></td></tr>
              <tr className="comp-sub-row"><td>Total 44AD Income (E2c)</td><td>{formatCurrency(comp.businessIncome)}</td><td></td></tr>
              <tr><td><strong>Income from Other Sources (Chapter IV F)</strong></td><td></td><td className="comp-val-cell">{formatCurrency(comp.otherSourcesTotal)}</td></tr>
              <tr className="comp-sub-row"><td>Interest From Saving Bank A/c</td><td>{formatCurrency(formData.savingInterest)}</td><td></td></tr>
              <tr className="comp-sub-row"><td>Interest on F.D.R.</td><td>{formatCurrency(formData.fdInterest)}</td><td></td></tr>
              <tr className="comp-sub-row"><td>Dividend From Shares</td><td>{formatCurrency(formData.dividendIncome)}</td><td></td></tr>
              <tr><td colSpan="2"><strong>Gross Total Income</strong></td><td className="comp-total-cell">{formatCurrency(comp.grossTotalIncome)}</td></tr>
              <tr><td colSpan="2">Less: Deductions (Chapter VI-A)</td><td className="comp-val-cell">0</td></tr>
              <tr><td colSpan="2"><strong>Total Income</strong></td><td className="comp-total-cell">{formatCurrency(comp.totalIncome)}</td></tr>
              <tr><td colSpan="2">Round off u/s 288 A</td><td className="comp-total-cell">{formatCurrency(comp.roundedIncome)}</td></tr>
              <tr><td colSpan="3" style={{fontSize: '0.8rem'}}>Adjusted total income (ATI) is not more than Rs. 20 lakhs hence AMT not applicable.</td></tr>
            </tbody>
          </table>

          <table className="comp-main-table">
            <tbody>
              <tr><td>Tax Due (Exemption Limit Rs. 300000)</td><td>{formatCurrency(comp.tax)}</td><td className="comp-val-cell"></td></tr>
              <tr><td>Rebate u/s 87A</td><td style={{borderBottom: '1px solid black'}}>{formatCurrency(comp.rebate)}</td><td className="comp-val-cell"></td></tr>
              <tr><td colSpan="2"></td><td className="comp-val-cell">0</td></tr>
              <tr><td colSpan="2">Fee for default in furnishing return of income u/s 234F</td><td className="comp-val-cell">{formatCurrency(formData.fee234F)}</td></tr>
              <tr><td colSpan="2">Round off u/s 288B</td><td className="comp-total-cell">{formatCurrency(formData.fee234F)}</td></tr>
              <tr><td colSpan="2">Deposit u/s 140A</td><td className="comp-total-cell">{formatCurrency(comp.totalPrepaid)}</td></tr>
              <tr><td colSpan="2"><strong>Tax Payable</strong></td><td className="comp-total-cell">0</td></tr>
            </tbody>
          </table>

          <div style={{pageBreakBefore: 'always'}} className="comp-analysis-section">
            <div className="comp-analysis-title">Income Declared u/s 44 AD</div>
            <table className="analysis-table">
               <tbody>
                  <tr><td>Gross Receipts/Turnover (ECS/Cheque/DD Mode) @ 6%</td><td className="analysis-val">{formData.turnoverECS.toFixed(2)}</td></tr>
                  <tr><td>Gross Receipts/Turnover (Cash Receipt) @ 8%</td><td className="analysis-val">{formData.turnoverCash.toFixed(2)}</td></tr>
                  <tr><td>Gross Receipts/Turnover (Other than ECS/DD) @ 8%</td><td className="analysis-val">{formData.turnoverNonDigital.toFixed(2)}</td></tr>
                  <tr><td><strong>Gross Receipts/Turnover (Total)</strong></td><td className="analysis-val"><strong>{comp.totalTurnover.toFixed(2)}</strong></td></tr>
                  <tr><td>Book Profit (Declared u/s E2)</td><td className="analysis-val">{comp.bookProfit.toFixed(2)}</td><td style={{width:'80px'}}>{comp.bookProfitPct} %</td></tr>
                  <tr><td>Deemed Profit (ECS @ 6%)</td><td className="analysis-val">{comp.deemedECS.toFixed(2)}</td><td>6.00 %</td></tr>
                  <tr><td>Deemed Profit (Cash @ 8%)</td><td className="analysis-val">{comp.deemedCash.toFixed(2)}</td><td>8.00 %</td></tr>
                  <tr><td>Deemed Profit (Other @ 8%)</td><td className="analysis-val">{comp.deemedNonDigital.toFixed(2)}</td><td>8.00 %</td></tr>
                  <tr><td><strong>Net Profit Declared</strong></td><td className="analysis-val"><strong>{comp.businessIncome.toFixed(2)}</strong></td><td><strong>{comp.netProfitPct} %</strong></td></tr>
               </tbody>
            </table>

            <div className="comp-analysis-title">Prepaid taxes (Advance tax and Self assessment tax)</div>
            <table className="analysis-table">
               <thead><tr><th>Sr.No.</th><th>BSR Code</th><th>Date</th><th>Challan No</th><th>Bank Name & Branch</th><th>Amount</th></tr></thead>
               <tbody>
                  {formData.prepaidTaxes.map((c, i) => (
                    <tr key={i}><td>{i+1}</td><td>{c.bsrCode}</td><td>{c.date}</td><td>{c.challanNo}</td><td>{c.bank}</td><td className="analysis-val">{c.amount}</td></tr>
                  ))}
                  <tr><td colSpan="5" style={{textAlign: 'right'}}><strong>Total</strong></td><td className="analysis-val"><strong>{comp.totalPrepaid}</strong></td></tr>
               </tbody>
            </table>

            <div className="comp-analysis-title">Bank Account Detail</div>
            <table className="analysis-table">
               <thead><tr><th>S.N.</th><th>Bank</th><th>Account No</th><th>IFSC Code</th><th>Type</th><th>Nominate</th></tr></thead>
               <tbody>
                  {formData.banks.map((b, i) => (
                    <tr key={i}><td>{i+1}</td><td>{b.name}</td><td>{b.accNo}</td><td>{b.ifsc}</td><td>{b.type}</td><td>{b.nominate}</td></tr>
                  ))}
               </tbody>
            </table>
          </div>

          <div className="comp-footer">
             <div style={{fontSize: '0.8rem'}}>CompuTax : {formData.compuTaxCode} [{formData.assesseeName}]</div>
             <div className="signature-line">
                Signature<br/>
                ({formData.assesseeName})<br/>
                Date-{formData.date}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITRComputation;
