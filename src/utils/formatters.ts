// Formatter utilities

/**
 * Format currency in TWD ($1,234)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(amount);
}

import { getTaiwanDateTimeStr } from './dateUtils';
export * from './dateUtils';

/**
 * Format timestamp into readable localized date and time in Taiwan timezone (Asia/Taipei)
 */
export function formatDateTime(isoString: string): string {
  try {
    return getTaiwanDateTimeStr(isoString);
  } catch {
    return isoString;
  }
}

/**
 * Format location code with friendly description
 */
export function describeLocation(code: string): string {
  if (!code) return '未指定';
  if (code.startsWith('A-') || code.startsWith('B-') || code.startsWith('C-') || code.startsWith('D-')) {
    const parts = code.split('-');
    return `門市 ${parts[0]}區 第${parseInt(parts[1] || '1', 10)}排 第${parts[2]?.replace('L', '') || '1'}層`;
  }
  if (code.startsWith('R')) {
    const parts = code.split('-');
    return `後倉 ${parts[0]}排架 第${parts[1]?.replace('C', '') || '1'}欄 第${parts[2]?.replace('L', '') || '1'}層`;
  }
  return code;
}
