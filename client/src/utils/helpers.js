// Convert number to words (Indian format)
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertHundreds(num) {
  let str = '';
  if (num > 99) {
    str += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num > 19) {
    str += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ones[num] + ' ';
  }
  return str.trim();
}

export function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  
  const isNegative = num < 0;
  num = Math.abs(num);
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = '';
  
  if (rupees === 0) {
    result = 'Zero';
  } else {
    // Indian numbering: Crore, Lakh, Thousand, Hundred
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const hundred = rupees % 1000;
    
    if (crore > 0) result += convertHundreds(crore) + ' Crore ';
    if (lakh > 0) result += convertHundreds(lakh) + ' Lakh ';
    if (thousand > 0) result += convertHundreds(thousand) + ' Thousand ';
    if (hundred > 0) result += convertHundreds(hundred) + ' ';
  }
  
  result = result.trim() + ' Rupees';
  
  if (paise > 0) {
    result += ' and ' + convertHundreds(paise) + ' Paise';
  }
  
  result += ' Only';
  
  if (isNegative) result = 'Minus ' + result;
  
  return result;
}

export function formatCurrency(num) {
  return '₹' + (num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function generateInvoiceNumber(prefix = 'INV') {
  const now = new Date();
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix}/${fy}-${fy + 1}/${seq}`;
}
