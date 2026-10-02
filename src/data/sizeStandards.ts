import { SizeUnit, SizeSegment, ShoeVariant, ProductWithVariants } from '../types/inventory';

export interface SizeStandard {
  sizeUS: number;
  sizeEU: number;
  sizeCM: number;
  isPopular?: boolean; // Hot-selling sizes (US 8.0 ~ 9.5)
}

export const SEGMENTS: { key: SizeSegment; label: string }[] = [
  { key: 'all', label: '全碼' },
  { key: 'men', label: '男段' },
  { key: 'women', label: '女段' },
  { key: 'youth', label: '青少年' },
  { key: 'kids', label: '童段' },
];

export const SIZE_UNITS: { key: SizeUnit; label: string; shortLabel: string }[] = [
  { key: 'US', label: '美國 (US)', shortLabel: 'US' },
  { key: 'EU', label: '歐洲 (EUR)', shortLabel: 'EU' },
  { key: 'CM', label: '日本 (JP)', shortLabel: 'JP(cm)' },
  { key: 'ALPHA', label: 'XS~2XL', shortLabel: 'XS~2XL' },
];

export const STANDARD_SIZES: SizeStandard[] = [
  { sizeUS: 6.0, sizeEU: 38.5, sizeCM: 24.0, isPopular: false },
  { sizeUS: 6.5, sizeEU: 39.0, sizeCM: 24.5, isPopular: false },
  { sizeUS: 7.0, sizeEU: 40.0, sizeCM: 25.0, isPopular: false },
  { sizeUS: 7.5, sizeEU: 40.5, sizeCM: 25.5, isPopular: false },
  { sizeUS: 8.0, sizeEU: 41.0, sizeCM: 26.0, isPopular: true },
  { sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5, isPopular: true },
  { sizeUS: 9.0, sizeEU: 42.5, sizeCM: 27.0, isPopular: true },
  { sizeUS: 9.5, sizeEU: 43.0, sizeCM: 27.5, isPopular: true },
  { sizeUS: 10.0, sizeEU: 44.0, sizeCM: 28.0, isPopular: false },
  { sizeUS: 10.5, sizeEU: 44.5, sizeCM: 28.5, isPopular: false },
  { sizeUS: 11.0, sizeEU: 45.0, sizeCM: 29.0, isPopular: false },
  { sizeUS: 11.5, sizeEU: 45.5, sizeCM: 29.5, isPopular: false },
  { sizeUS: 12.0, sizeEU: 46.0, sizeCM: 30.0, isPopular: false },
];

/**
 * Standard shoe size reference charts for kids, youth, and adults
 */
export const KIDS_SIZE_STANDARDS: SizeStandard[] = [
  { sizeUS: 6.0, sizeEU: 22.0, sizeCM: 12.0 },
  { sizeUS: 6.5, sizeEU: 22.5, sizeCM: 12.5 },
  { sizeUS: 7.0, sizeEU: 23.0, sizeCM: 13.0 },
  { sizeUS: 7.0, sizeEU: 23.5, sizeCM: 13.0 },
  { sizeUS: 7.5, sizeEU: 24.0, sizeCM: 13.5 },
  { sizeUS: 8.0, sizeEU: 25.0, sizeCM: 14.0 },
  { sizeUS: 8.5, sizeEU: 25.5, sizeCM: 14.5 },
  { sizeUS: 9.0, sizeEU: 26.0, sizeCM: 15.0 },
  { sizeUS: 9.5, sizeEU: 26.5, sizeCM: 15.5 },
  { sizeUS: 10.0, sizeEU: 27.0, sizeCM: 16.0 },
  { sizeUS: 10.5, sizeEU: 27.5, sizeCM: 16.5 },
  { sizeUS: 11.0, sizeEU: 28.0, sizeCM: 17.0 },
  { sizeUS: 11.5, sizeEU: 28.5, sizeCM: 17.5 },
  { sizeUS: 12.0, sizeEU: 29.5, sizeCM: 18.0 },
  { sizeUS: 12.5, sizeEU: 30.0, sizeCM: 18.5 },
  { sizeUS: 13.0, sizeEU: 31.0, sizeCM: 19.0 },
  { sizeUS: 13.5, sizeEU: 31.5, sizeCM: 19.5 },
];

export const YOUTH_SIZE_STANDARDS: SizeStandard[] = [
  { sizeUS: 1.0, sizeEU: 32.0, sizeCM: 20.0 },
  { sizeUS: 1.5, sizeEU: 33.0, sizeCM: 20.5 },
  { sizeUS: 2.0, sizeEU: 33.5, sizeCM: 21.0 },
  { sizeUS: 2.5, sizeEU: 34.0, sizeCM: 21.5 },
  { sizeUS: 3.0, sizeEU: 35.0, sizeCM: 22.0 },
  { sizeUS: 3.5, sizeEU: 35.5, sizeCM: 22.5 },
  { sizeUS: 4.0, sizeEU: 36.0, sizeCM: 23.0 },
  { sizeUS: 4.5, sizeEU: 36.5, sizeCM: 23.5 },
  { sizeUS: 5.0, sizeEU: 37.5, sizeCM: 23.5 },
  { sizeUS: 5.5, sizeEU: 38.0, sizeCM: 24.0 },
  { sizeUS: 6.0, sizeEU: 38.5, sizeCM: 24.0 },
  { sizeUS: 6.5, sizeEU: 39.0, sizeCM: 24.5 },
  { sizeUS: 7.0, sizeEU: 40.0, sizeCM: 25.0 },
];

export const EXTENDED_ADULT_STANDARDS: SizeStandard[] = [
  { sizeUS: 3.0, sizeEU: 35.0, sizeCM: 22.0 },
  { sizeUS: 3.5, sizeEU: 35.5, sizeCM: 22.5 },
  { sizeUS: 4.0, sizeEU: 36.0, sizeCM: 23.0 },
  { sizeUS: 4.5, sizeEU: 36.5, sizeCM: 23.5 },
  { sizeUS: 5.0, sizeEU: 35.5, sizeCM: 22.0 },
  { sizeUS: 5.5, sizeEU: 36.0, sizeCM: 22.5 },
  ...STANDARD_SIZES,
  { sizeUS: 12.5, sizeEU: 46.5, sizeCM: 30.5 },
  { sizeUS: 12.5, sizeEU: 47.0, sizeCM: 30.5 },
  { sizeUS: 13.0, sizeEU: 47.5, sizeCM: 31.0 },
  { sizeUS: 13.5, sizeEU: 48.0, sizeCM: 31.5 },
  { sizeUS: 14.0, sizeEU: 48.5, sizeCM: 32.0 },
  { sizeUS: 14.5, sizeEU: 49.0, sizeCM: 32.5 },
  { sizeUS: 15.0, sizeEU: 49.5, sizeCM: 33.0 },
];

/**
 * Segment sizes mapping according to standard shoe size charts
 */
export const SEGMENT_SIZES: Record<SizeSegment, Record<SizeUnit, string[]>> = {
  all: {
    // US sizes: minimum size is 3 (3.0), maximum size is 15 (15.0), no C or Y, sorted ascending
    US: [
      '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5',
      '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5',
      '13.0', '13.5', '14.0', '14.5', '15.0',
    ],
    // European sizes continuous every 0.5 size from 22 (kids) to 47 (adult), includes 35 (min adult) & 37
    EU: [
      '22', '22.5', '23', '23.5', '24', '24.5', '25', '25.5', '26', '26.5', '27', '27.5', '28', '28.5', '29', '29.5', '30', '30.5', '31', '31.5',
      '32', '32.5', '33', '33.5', '34', '34.5', '35', '35.5', '36', '36.5', '37', '37.5', '38', '38.5', '39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '45.5', '46', '46.5', '47',
    ],
    // CM sizes with clear differentiation for overlapping segment sizes like kids 20 vs adult 20
    CM: [
      '12.0', '12.5', '13.0', '13.5', '14.0', '14.5', '15.0', '15.5', '16.0', '16.5', '17.0', '17.5', '18.0', '18.5', '19.0', '19.5',
      '童段 20.0', '大人段 20.0',
      '20.5', '21.0', '21.5', '22.0', '22.5', '23.0', '23.5', '24.0', '24.5', '25.0', '25.5', '26.0', '26.5', '27.0', '27.5', '28.0', '28.5', '29.0', '29.5', '30.0', '30.5', '31.0',
    ],
    ALPHA: ['XS', 'S', 'M', 'L', '2L', 'XL', '2XL'],
  },
  men: {
    US: [
      '7.0', '7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5',
      '13.0', '13.5', '14.0', '14.5', '15.0',
    ],
    EU: ['38.5', '39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '45.5', '46', '46.5', '47'],
    CM: ['24.5', '25.0', '25.5', '26.0', '26.5', '27.0', '27.5', '28.0', '28.5', '29.0', '29.5', '30.0', '30.5', '31.0'],
    ALPHA: ['XS', 'S', 'M', 'L', '2L', 'XL', '2XL'],
  },
  women: {
    US: ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0', '9.5', '10.0', '10.5'],
    // Adult women European size starts at 35, continuous every 0.5 size
    EU: ['35', '35.5', '36', '36.5', '37', '37.5', '38', '38.5', '39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5', '43'],
    CM: ['大人段 20.0', '20.5', '21.0', '21.5', '22.0', '22.5', '23.0', '23.5', '24.0', '24.5', '25.0', '25.5', '26.0', '26.5'],
    ALPHA: ['XS', 'S', 'M', 'L', '2L', 'XL', '2XL'],
  },
  youth: {
    US: ['3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0'],
    // Continuous every 0.5 size from 32 to 40, explicitly including 37
    EU: ['32', '32.5', '33', '33.5', '34', '34.5', '35', '35.5', '36', '36.5', '37', '37.5', '38', '38.5', '39', '39.5', '40'],
    CM: ['童段 20.0', '20.5', '21.0', '21.5', '22.0', '22.5', '23.0', '23.5', '24.0', '24.5', '25.0'],
    ALPHA: ['XS', 'S', 'M', 'L', '2L', 'XL', '2XL'],
  },
  kids: {
    US: ['3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0'],
    // Continuous every 0.5 size from 22 to 31.5 without skipped numbers
    EU: ['22', '22.5', '23', '23.5', '24', '24.5', '25', '25.5', '26', '26.5', '27', '27.5', '28', '28.5', '29', '29.5', '30', '30.5', '31', '31.5'],
    CM: ['12.0', '12.5', '13.0', '13.5', '14.0', '14.5', '15.0', '15.5', '16.0', '16.5', '17.0', '17.5', '18.0', '18.5', '19.0', '19.5', '童段 20.0'],
    ALPHA: ['XS', 'S', 'M', 'L', '2L', 'XL', '2XL'],
  },
};

/**
 * Get sizes list for given segment and unit
 */
export function getSegmentSizes(segment: SizeSegment = 'all', unit: SizeUnit = 'US'): string[] {
  const seg = SEGMENT_SIZES[segment] || SEGMENT_SIZES.all;
  return seg[unit] || seg.US;
}

/**
 * Get unified, deduplicated, continuously ordered size list for multiple segments
 */
export function getMultiSegmentSizes(segments: SizeSegment[] = ['all'], unit: SizeUnit = 'US'): string[] {
  if (!segments || segments.length === 0 || segments.includes('all')) {
    return getSegmentSizes('all', unit);
  }
  if (segments.length === 1) {
    return getSegmentSizes(segments[0], unit);
  }

  // Canonical full ordering for current unit
  const canonicalList = SEGMENT_SIZES.all[unit] || SEGMENT_SIZES.all.US;
  const activeSizesSet = new Set<string>();

  segments.forEach((seg) => {
    const segList = getSegmentSizes(seg, unit);
    segList.forEach((s) => activeSizesSet.add(s));
  });

  // Filter canonicalList to maintain natural sorting and deduplication
  const result: string[] = [];
  canonicalList.forEach((s) => {
    if (activeSizesSet.has(s)) {
      result.push(s);
      activeSizesSet.delete(s);
    }
  });

  // Any remaining sizes not in canonicalList appended with numeric sort
  if (activeSizesSet.size > 0) {
    const remaining = Array.from(activeSizesSet).sort((a, b) => {
      const numA = parseSizeToNumeric(a);
      const numB = parseSizeToNumeric(b);
      return numA - numB;
    });
    result.push(...remaining);
  }

  return result;
}

/**
 * Convert arbitrary size label to numeric sizeUS for compatibility
 */
export function parseSizeToNumeric(sizeLabel: string): number {
  if (!sizeLabel) return 0;
  const trimmed = sizeLabel.trim();

  // Match kids / youth with C or Y suffix e.g. "6.5C" -> 6.5, "1.5Y" -> 1.5
  const cyMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[cy]$/i);
  if (cyMatch) return parseFloat(cyMatch[1]);

  // Match alpha XS~2XL
  const alphaMap: Record<string, number> = {
    XS: 1,
    S: 2,
    M: 3,
    L: 4,
    '2L': 5,
    LL: 5,
    XL: 6,
    '2XL': 7,
    XXL: 7,
  };
  const upper = trimmed.toUpperCase();
  if (alphaMap[upper] !== undefined) {
    return alphaMap[upper];
  }

  // Match embedded number (e.g. "童段 20.0" -> 20.0, "大人段 20.0" -> 20.0, "童段 20" -> 20.0)
  const embeddedMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (embeddedMatch) {
    return parseFloat(embeddedMatch[1]);
  }

  // Pure numeric (like 8.5, 42, 26.5)
  const num = parseFloat(trimmed);
  return isNaN(num) ? 0 : num;
}

export interface ResolvedSizeInfo {
  sizeUS: number;
  sizeEU: number;
  sizeCM: number;
  sizeDisplay: string;
}

/**
 * Resolve full cross-unit size attributes (US/EU/CM/Display) from sizeKey
 */
export function resolveVariantSize(sizeKey: string, activeUnit: SizeUnit = 'US'): ResolvedSizeInfo {
  const trimmed = sizeKey.trim();

  // 1. Explicit segment annotations for overlapping sizes (e.g. 2133 Kids 20 vs Adult 20)
  if (trimmed.includes('童段 20') || trimmed === '童段 20.0') {
    return { sizeUS: 1.0, sizeEU: 32.0, sizeCM: 20.0, sizeDisplay: trimmed };
  }
  if (trimmed.includes('大人段 20') || trimmed === '大人段 20.0') {
    return { sizeUS: 3.0, sizeEU: 35.0, sizeCM: 20.0, sizeDisplay: trimmed };
  }

  // 2. Legacy C or Y sizes -> remove C/Y directly, ensure minimum 3.0 for US
  const cyMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[cy]$/i);
  if (cyMatch) {
    const rawNum = parseFloat(cyMatch[1]);
    const num = Math.max(3.0, rawNum);
    const cleanDisplay = num % 1 === 0 ? num.toFixed(1) : `${num}`;
    const found = EXTENDED_ADULT_STANDARDS.find(a => Math.abs(a.sizeUS - num) < 0.05);
    return {
      sizeUS: num,
      sizeEU: found?.sizeEU ?? Math.round((num * 1.25 + 31) * 2) / 2,
      sizeCM: found?.sizeCM ?? Math.round((num * 0.85 + 19) * 2) / 2,
      sizeDisplay: cleanDisplay,
    };
  }

  // 4. Alpha sizes (XS ~ 2XL)
  const upper = trimmed.toUpperCase();
  const alphaMap: Record<string, { sizeUS: number; sizeEU: number; sizeCM: number }> = {
    XS: { sizeUS: 5.5, sizeEU: 36.0, sizeCM: 22.5 },
    S: { sizeUS: 7.0, sizeEU: 40.0, sizeCM: 25.0 },
    M: { sizeUS: 8.5, sizeEU: 42.0, sizeCM: 26.5 },
    L: { sizeUS: 10.0, sizeEU: 44.0, sizeCM: 28.0 },
    '2L': { sizeUS: 10.5, sizeEU: 44.5, sizeCM: 28.5 },
    LL: { sizeUS: 10.5, sizeEU: 44.5, sizeCM: 28.5 },
    XL: { sizeUS: 11.5, sizeEU: 45.5, sizeCM: 29.5 },
    '2XL': { sizeUS: 13.0, sizeEU: 47.5, sizeCM: 31.0 },
    XXL: { sizeUS: 13.0, sizeEU: 47.5, sizeCM: 31.0 },
  };
  if (alphaMap[upper]) {
    return {
      ...alphaMap[upper],
      sizeDisplay: upper === 'LL' ? '2L' : upper === 'XXL' ? '2XL' : upper,
    };
  }

  // Auto-detect unit if cross-unit size was preserved across unit toggle:
  // Strip common unit prefixes (e.g. "US 6.0" -> "6.0", "EUR 38" -> "38", "JP 24.5" -> "24.5")
  const strippedNumStr = trimmed.replace(/^(US|EU|EUR|JP|CM)\s*/i, '').trim();
  const rawNum = parseFloat(strippedNumStr);
  let effectiveUnit = activeUnit;
  if (!isNaN(rawNum)) {
    if (activeUnit === 'EU' && rawNum < 20) {
      effectiveUnit = 'US';
    } else if (activeUnit === 'US' && rawNum >= 32) {
      effectiveUnit = 'EU';
    }
  }

  // 5. EU Unit input
  if (effectiveUnit === 'EU') {
    const eu = rawNum;
    if (!isNaN(eu)) {
      if (eu < 32) {
        const found = KIDS_SIZE_STANDARDS.find(k => Math.abs(k.sizeEU - eu) < 0.3);
        if (found) return { sizeUS: found.sizeUS, sizeEU: eu, sizeCM: found.sizeCM, sizeDisplay: trimmed };
        // Fallback for kids EU: map safely without producing negative numbers
        const kidsUS = Math.max(1, Math.round((eu - 10) / 1.7 * 2) / 2);
        return {
          sizeUS: kidsUS,
          sizeEU: eu,
          sizeCM: Math.round((eu * 0.65 + 1) * 2) / 2,
          sizeDisplay: trimmed,
        };
      } else if (eu >= 32 && eu < 35) {
        const found = YOUTH_SIZE_STANDARDS.find(y => Math.abs(y.sizeEU - eu) < 0.3);
        if (found) return { sizeUS: found.sizeUS, sizeEU: eu, sizeCM: found.sizeCM, sizeDisplay: trimmed };
        const youthUS = Math.max(1, Math.round((eu - 31) * 2) / 2);
        return {
          sizeUS: youthUS,
          sizeEU: eu,
          sizeCM: Math.round((eu * 0.65 + 1) * 2) / 2,
          sizeDisplay: trimmed,
        };
      } else {
        const found = EXTENDED_ADULT_STANDARDS.find(a => Math.abs(a.sizeEU - eu) < 0.3);
        if (found) return { sizeUS: found.sizeUS, sizeEU: eu, sizeCM: found.sizeCM, sizeDisplay: trimmed };
      }
      return {
        sizeUS: Math.max(1, Math.round((eu - 31) / 1.25 * 2) / 2),
        sizeEU: eu,
        sizeCM: Math.round((eu * 0.65 + 1) * 2) / 2,
        sizeDisplay: trimmed,
      };
    }
  }

  // 6. CM Unit input
  if (effectiveUnit === 'CM') {
    const cm = rawNum;
    if (!isNaN(cm)) {
      if (cm < 20) {
        const found = KIDS_SIZE_STANDARDS.find(k => Math.abs(k.sizeCM - cm) < 0.25);
        if (found) return { sizeUS: found.sizeUS, sizeEU: found.sizeEU, sizeCM: cm, sizeDisplay: trimmed };
      } else {
        const found = EXTENDED_ADULT_STANDARDS.find(a => Math.abs(a.sizeCM - cm) < 0.25);
        if (found) return { sizeUS: found.sizeUS, sizeEU: found.sizeEU, sizeCM: cm, sizeDisplay: trimmed };
      }
      return {
        sizeUS: Math.round((cm - 19) / 0.85 * 2) / 2,
        sizeEU: Math.round((cm * 1.5 + 4) * 2) / 2,
        sizeCM: cm,
        sizeDisplay: trimmed,
      };
    }
  }

  // 7. Standard US Adult numeric
  const num = rawNum;
  if (!isNaN(num)) {
    const cleanDisplay = trimmed.replace(/[CYcy]/g, '').trim();
    const found = EXTENDED_ADULT_STANDARDS.find(a => Math.abs(a.sizeUS - num) < 0.05);
    if (found) {
      return {
        sizeUS: num,
        sizeEU: found.sizeEU,
        sizeCM: found.sizeCM,
        sizeDisplay: cleanDisplay,
      };
    }
    return {
      sizeUS: num,
      sizeEU: Math.round((num * 1.25 + 31) * 2) / 2,
      sizeCM: Math.round((num * 0.85 + 19) * 2) / 2,
      sizeDisplay: cleanDisplay,
    };
  }

  return {
    sizeUS: 0,
    sizeEU: 0,
    sizeCM: 0,
    sizeDisplay: trimmed,
  };
}

/**
 * Check if a variant and a sizeKey refer to the exact same size, strictly preventing
 * segment collisions (e.g. Kids 20 vs Adult 20).
 */
export function isSameSizeVariant(v: ShoeVariant, sizeKey: string): boolean {
  if (!sizeKey) return false;
  const trimmedKey = sizeKey.trim();

  // Distinguish CM specific segment notes ('童段 20' vs '大人段 20')
  const isVKidCM = (v.sizeDisplay && v.sizeDisplay.includes('童')) || false;
  const isKeyKidCM = trimmedKey.includes('童');
  const isVAdultCM = (v.sizeDisplay && v.sizeDisplay.includes('大')) || false;
  const isKeyAdultCM = trimmedKey.includes('大');

  if (isVKidCM !== isKeyKidCM && (isVKidCM || isKeyKidCM)) return false;
  if (isVAdultCM !== isKeyAdultCM && (isVAdultCM || isKeyAdultCM)) return false;

  const cleanV = (v.sizeDisplay || '').replace(/[CYcy]/g, '').replace(/^US\s*/i, '').trim();
  const cleanKey = trimmedKey.replace(/[CYcy]/g, '').replace(/^US\s*/i, '').trim();

  if (v.sizeDisplay) {
    if (v.sizeDisplay === trimmedKey) return true;
    if (cleanV && cleanV === cleanKey) return true;

    // Both are annotated CM sizes
    if (isVKidCM && isKeyKidCM && v.sizeDisplay.includes('童段 20') && trimmedKey.includes('童段 20')) return true;
    if (isVAdultCM && isKeyAdultCM && v.sizeDisplay.includes('大人段 20') && trimmedKey.includes('大人段 20')) return true;

    const numV = parseSizeToNumeric(cleanV);
    const numKey = parseSizeToNumeric(cleanKey);
    if (numV > 0 && numKey > 0) {
      if (Math.abs(numV - numKey) < 0.05) {
        return true;
      }
      // If both numbers belong to the same unit domain (both >= 20 for EU/CM, or both < 20 for US),
      // they are explicitly different sizes within that unit and must NOT fall through to fuzzy cross-unit matching!
      const bothEUorCM = numV >= 20 && numKey >= 20;
      const bothUS = numV < 20 && numKey < 20;
      if (bothEUorCM || bothUS) {
        return false;
      }
    }

    // Direct comparison against variant's stored EU or CM
    if (v.sizeEU !== undefined && numKey > 0 && Math.abs(v.sizeEU - numKey) < 0.1) {
      return true;
    }
    if (v.sizeCM !== undefined && numKey > 0 && Math.abs(v.sizeCM - numKey) < 0.1) {
      return true;
    }

    // Cross-unit matching via resolveVariantSize
    const resolvedKey = resolveVariantSize(trimmedKey);
    if (resolvedKey.sizeUS > 0 && Math.abs(v.sizeUS - resolvedKey.sizeUS) < 0.05) {
      return true;
    }

    return false;
  }

  // If v has no sizeDisplay (e.g. legacy or pure adult numeric variant)
  const num = parseSizeToNumeric(cleanKey);
  if (num > 0 && Math.abs(v.sizeUS - num) < 0.05) return true;
  if (v.sizeEU !== undefined && num > 0 && Math.abs(v.sizeEU - num) < 0.1) return true;
  if (v.sizeCM !== undefined && num > 0 && Math.abs(v.sizeCM - num) < 0.1) return true;

  const resolved = resolveVariantSize(trimmedKey);
  return resolved.sizeUS > 0 && Math.abs(v.sizeUS - resolved.sizeUS) < 0.05;
}

/**
 * Get canonical index in all sizes for ordering
 */
export function getCanonicalSizeIndex(sizeKey: string, unit: SizeUnit = 'US'): number {
  const canonicalList = SEGMENT_SIZES.all[unit] || SEGMENT_SIZES.all.US;
  const idx = canonicalList.indexOf(sizeKey);
  if (idx !== -1) return idx;

  // Clean C/Y if present
  const cleaned = sizeKey.replace(/[CYcy]/g, '').trim();
  const cleanedIdx = canonicalList.indexOf(cleaned);
  if (cleanedIdx !== -1) return cleanedIdx;

  // Partial match for annotated sizes
  if (sizeKey.includes('童段 20') || sizeKey === '童段 20') {
    const kid20Idx = canonicalList.findIndex(k => k.includes('童段 20'));
    if (kid20Idx !== -1) return kid20Idx;
  }
  if (sizeKey.includes('大人段 20') || sizeKey === '大人段 20') {
    const adult20Idx = canonicalList.findIndex(k => k.includes('大人段 20'));
    if (adult20Idx !== -1) return adult20Idx;
  }

  // Numeric match with canonicalList
  const num = parseSizeToNumeric(cleaned || sizeKey);
  if (num > 0) {
    const numIdx = canonicalList.findIndex(s => Math.abs(parseSizeToNumeric(s) - num) < 0.05);
    if (numIdx !== -1) return numIdx;
  }

  return 9999 + parseSizeToNumeric(sizeKey);
}

/**
 * Get sort rank for sizes (kids < youth < adult)
 */
export function getSegmentSortRank(sizeDisplay: string = '', sizeUS: number = 0): number {
  const s = sizeDisplay.trim();
  if (s.includes('童')) {
    return 1000 + (parseSizeToNumeric(s) || sizeUS);
  }
  if (s.includes('青')) {
    return 2000 + (parseSizeToNumeric(s) || sizeUS);
  }
  if (s.includes('大') || s.includes('女') || s.includes('男')) {
    return 3000 + (parseSizeToNumeric(s) || sizeUS);
  }
  const displayNum = parseSizeToNumeric(s);
  // For European (EU >= 20) or CM sizes, sort by their actual display number so 22 < 24 < 26 < 42 < 45
  if (displayNum >= 20) {
    return displayNum;
  }
  return sizeUS || displayNum;
}

/**
 * Get size conversion for a given US size
 */
export function getSizeConversion(sizeUS: number): SizeStandard {
  const found = STANDARD_SIZES.find(s => Math.abs(s.sizeUS - sizeUS) < 0.01);
  if (found) return found;
  const extended = EXTENDED_ADULT_STANDARDS.find(s => Math.abs(s.sizeUS - sizeUS) < 0.01);
  if (extended) return extended;
  const kids = KIDS_SIZE_STANDARDS.find(s => Math.abs(s.sizeUS - sizeUS) < 0.01);
  if (kids) return kids;
  const youth = YOUTH_SIZE_STANDARDS.find(s => Math.abs(s.sizeUS - sizeUS) < 0.01);
  if (youth) return youth;

  // Approximation fallback
  return {
    sizeUS,
    sizeEU: Math.round((sizeUS * 1.25 + 31) * 2) / 2,
    sizeCM: Math.round((sizeUS * 0.85 + 19) * 2) / 2,
  };
}

/**
 * Format size display text based on active size unit (US / EU / CM / ALPHA)
 */
export function formatSizeDisplay(sizeUS: number, unit: SizeUnit, sizeDisplay?: string): string {
  if (sizeDisplay) {
    const cleaned = sizeDisplay.replace(/([0-9]+(?:\.[0-9]+)?)[CYcy]\b/g, '$1').trim();
    if (unit === 'ALPHA' && ['XS', 'S', 'M', 'L', '2L', 'LL', 'XL', '2XL', 'XXL'].includes(cleaned.toUpperCase())) {
      return cleaned.toUpperCase() === 'LL' ? '2L' : cleaned.toUpperCase() === 'XXL' ? '2XL' : cleaned;
    }
    // Annotated sizes like "童段 20.0" or "大人段 20.0"
    if (cleaned.includes('童') || cleaned.includes('大')) {
      return cleaned;
    }
    if (unit === 'US') {
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        return num % 1 === 0 ? num.toFixed(1) : `${num}`;
      }
      return cleaned;
    }
    if (unit === 'EU') {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 22 && num <= 49) {
        return cleaned;
      }
    }
    if (unit === 'CM') {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 10 && num <= 34) {
        return cleaned.includes('cm') ? cleaned : `${cleaned} cm`;
      }
    }
  }
  if (unit === 'ALPHA') {
    return sizeDisplay || (sizeUS ? `${sizeUS}` : '');
  }
  const std = getSizeConversion(sizeUS);
  switch (unit) {
    case 'US':
      return std.sizeUS.toFixed(1);
    case 'EU':
      return std.sizeEU.toString();
    case 'CM':
      return `${std.sizeCM.toFixed(1)} cm`;
    default:
      return `${sizeUS.toFixed(1)}`;
  }
}

/**
 * Format size header label
 */
export function getSizeHeaderLabel(sizeUS: number, unit: SizeUnit, sizeDisplay?: string): string {
  if (sizeDisplay) {
    const cleaned = sizeDisplay.replace(/([0-9]+(?:\.[0-9]+)?)[CYcy]\b/g, '$1').trim();
    if (unit === 'ALPHA' && ['XS', 'S', 'M', 'L', '2L', 'LL', 'XL', '2XL', 'XXL'].includes(cleaned.toUpperCase())) {
      return cleaned.toUpperCase() === 'LL' ? '2L' : cleaned.toUpperCase() === 'XXL' ? '2XL' : cleaned;
    }
    if (cleaned.includes('童') || cleaned.includes('大')) {
      return cleaned;
    }
    if (unit === 'US') {
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        return num % 1 === 0 ? num.toFixed(1) : `${num}`;
      }
      return cleaned;
    }
    if (unit === 'EU') {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 22 && num <= 49) {
        return cleaned;
      }
    }
    if (unit === 'CM') {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 10 && num <= 34) {
        return cleaned;
      }
    }
  }
  if (unit === 'ALPHA') {
    return sizeDisplay || `${sizeUS}`;
  }
  const std = getSizeConversion(sizeUS);
  switch (unit) {
    case 'US':
      return `${std.sizeUS.toFixed(1)}`;
    case 'EU':
      return `${std.sizeEU}`;
    case 'CM':
      return `${std.sizeCM.toFixed(1)}`;
    default:
      return `${sizeUS.toFixed(1)}`;
  }
}

/**
 * Format a sale record's size for display on receipts, ledger, and cash register.
 * Preserves the exact original size label without conversion ("他原本是多少就是多少"),
 * while directly removing C and Y suffixes for clean display.
 */
export function formatSaleSizeDisplay(sizeDisplay?: string, sizeUS?: number): string {
  const trimmed = sizeDisplay?.trim();
  if (trimmed) {
    return trimmed.replace(/([0-9]+(?:\.[0-9]+)?)[CYcy]\b/g, '$1');
  }
  if (sizeUS !== undefined && sizeUS !== null && !isNaN(sizeUS)) {
    return `${sizeUS}`;
  }
  return '標準碼';
}

/**
 * Accurately determine the product's native size unit based on its explicit
 * sizeUnit attribute, or inferred directly from its existing inventory variants.
 * Zero speculation, no cross-unit distortion.
 */
export function getProductSizeUnit(product: ProductWithVariants): SizeUnit {
  // 1. Explicit sizeUnit on product
  if (product.sizeUnit) return product.sizeUnit;

  // 1.1 Check minSize / maxSize if explicitly recorded
  const checkStr = (product.minSize || product.maxSize || '').trim();
  if (checkStr) {
    if (['XS', 'S', 'M', 'L', '2L', 'LL', 'XL', '2XL', 'XXL', 'F'].includes(checkStr.toUpperCase())) {
      return 'ALPHA';
    }
    if (checkStr.toLowerCase().includes('cm') || checkStr.includes('公分')) {
      return 'CM';
    }
    const num = parseFloat(checkStr.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) {
      if (num >= 32 && num <= 55) return 'EU';
      if (num >= 10 && num <= 31 && checkStr.includes('.')) return 'CM';
    }
  }

  const variants = product.variants || [];
  if (variants.length === 0) {
    if (product.category === '雨鞋') return 'EU';
    return 'US';
  }

  const displays = variants.map((v) => (v.sizeDisplay || '').trim()).filter(Boolean);

  // 2. Alpha sizes: XS, S, M, L, 2L, LL, XL, 2XL, XXL, F
  if (displays.some((d) => ['XS', 'S', 'M', 'L', '2L', 'LL', 'XL', '2XL', 'XXL', 'F'].includes(d.toUpperCase()))) {
    return 'ALPHA';
  }

  // 3. CM / JP sizes: explicitly contains 'cm', '公分', or segment tags
  if (displays.some((d) => d.toLowerCase().includes('cm') || d.includes('公分') || d.includes('童段 20') || d.includes('大人段 20'))) {
    return 'CM';
  }

  // 4. Category rain boots -> European
  if (product.category === '雨鞋') {
    return 'EU';
  }

  // 5. Check numeric values
  const nums = displays
    .map((d) => parseFloat(d.replace(/^[A-Za-z\s]+/, '')))
    .filter((n) => !isNaN(n));

  // If there are numbers in adult European range (32 to 48)
  if (nums.some((n) => n >= 32 && n <= 48)) {
    return 'EU';
  }

  // If all numbers are European kids sizes (20 to 31 integers)
  if (nums.length > 0 && nums.every((n) => n >= 20 && n <= 31 && n % 1 === 0)) {
    return 'EU';
  }

  // 6. Otherwise US sizes (e.g. 5.0, 6.0, 7.0, 8.5, 9.0, 10.0...)
  return 'US';
}

/**
 * Match a pending customer reservation to a product variant accurately and defensively.
 * Handles exact variantId, clean normalized size strings, and numeric US/EU/CM tolerances.
 */
export function isReservationVariantMatch(
  reservation: {
    sku: string;
    sizeDisplay: string;
    sizeUS?: number | null;
    variantId?: string;
    productId?: string;
  },
  variant: ShoeVariant,
  productSku: string,
  productId?: string
): boolean {
  // 1. SKU check
  if (reservation.sku.trim().toUpperCase() !== productSku.trim().toUpperCase()) {
    return false;
  }

  // 1b. Product ID check if both are present
  if (productId && reservation.productId && reservation.productId !== productId) {
    return false;
  }

  // 2. Exact variant ID check if preserved
  if (reservation.variantId && variant.id && reservation.variantId === variant.id) {
    return true;
  }

  // 3. Normalized sizeDisplay exact match
  const cleanResDisplay = (reservation.sizeDisplay || '')
    .trim()
    .replace(/^(US|EU|EUR|JP|CM)\s*/i, '')
    .replace(/(\s*cm|\s*公分|\s*號|\s*碼)$/i, '')
    .trim();
  const cleanVarDisplay = (variant.sizeDisplay || '')
    .trim()
    .replace(/^(US|EU|EUR|JP|CM)\s*/i, '')
    .replace(/(\s*cm|\s*公分|\s*號|\s*碼)$/i, '')
    .trim();

  if (cleanResDisplay && cleanVarDisplay && cleanResDisplay.toUpperCase() === cleanVarDisplay.toUpperCase()) {
    return true;
  }

  // 4. Numeric size check
  const resNum = parseFloat(cleanResDisplay);
  const varNum = parseFloat(cleanVarDisplay);
  if (!isNaN(resNum) && !isNaN(varNum) && Math.abs(resNum - varNum) < 0.05) {
    return true;
  }

  // 5. Explicit sizeUS comparison
  if (
    typeof reservation.sizeUS === 'number' &&
    reservation.sizeUS > 0 &&
    typeof variant.sizeUS === 'number' &&
    variant.sizeUS > 0 &&
    Math.abs(reservation.sizeUS - variant.sizeUS) < 0.05
  ) {
    return true;
  }

  // 6. Cross-unit isSameSizeVariant fallback
  if (cleanResDisplay && isSameSizeVariant(variant, cleanResDisplay)) {
    return true;
  }

  return false;
}

export const DEFAULT_UNIT_RANGES: Record<SizeUnit, { min: string; max: string }> = {
  US: { min: '3.0', max: '13.0' },
  EU: { min: '35', max: '45' },
  CM: { min: '22.0', max: '29.0' },
  ALPHA: { min: 'XS', max: '2XL' },
};

export const UNIT_ALL_SIZES: Record<SizeUnit, string[]> = {
  US: [
    '3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5',
    '8.0', '8.5', '9.0', '9.5', '10.0', '10.5', '11.0', '11.5', '12.0', '12.5',
    '13.0', '13.5', '14.0', '14.5', '15.0',
  ],
  EU: [
    '22', '22.5', '23', '23.5', '24', '24.5', '25', '25.5', '26', '26.5', '27', '27.5', '28', '28.5', '29', '29.5', '30', '30.5', '31', '31.5',
    '32', '32.5', '33', '33.5', '34', '34.5', '35', '35.5', '36', '36.5', '37', '37.5', '38', '38.5', '39', '39.5', '40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '45.5', '46', '46.5', '47',
  ],
  CM: [
    '12.0', '12.5', '13.0', '13.5', '14.0', '14.5', '15.0', '15.5', '16.0', '16.5', '17.0', '17.5', '18.0', '18.5', '19.0', '19.5',
    '20.0', '20.5', '21.0', '21.5', '22.0', '22.5', '23.0', '23.5', '24.0', '24.5', '25.0', '25.5', '26.0', '26.5', '27.0', '27.5', '28.0', '28.5', '29.0', '29.5', '30.0', '30.5', '31.0',
  ],
  ALPHA: ['XS', 'S', 'M', 'L', '2L', 'XL', '2XL'],
};

export function getUnitMinMaxBounds(unit: SizeUnit = 'US'): { min: string; max: string; allSizes: string[] } {
  const allSizes = UNIT_ALL_SIZES[unit] || UNIT_ALL_SIZES.US;
  return {
    min: allSizes[0],
    max: allSizes[allSizes.length - 1],
    allSizes: [...allSizes],
  };
}

export function normalizeSizeKey(unit: SizeUnit, raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // Preserve legacy segment annotations if present
  if (trimmed.includes('童') || trimmed.includes('大')) {
    return trimmed;
  }
  if (unit === 'ALPHA') {
    const u = trimmed.toUpperCase();
    if (u === 'LL') return '2L';
    if (u === 'XXL') return '2XL';
    return u;
  }
  const match = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    if (!isNaN(num)) {
      if (unit === 'EU') {
        return num % 1 === 0 ? String(num) : num.toFixed(1);
      }
      return num.toFixed(1);
    }
  }
  return trimmed;
}

export function isWholeSizeKey(sizeKey: string): boolean {
  if (!sizeKey) return true;
  const num = parseFloat(sizeKey.replace(/[^\d.]/g, ''));
  if (isNaN(num)) return true;
  return Number.isInteger(num) || Math.abs(num - Math.round(num)) < 0.001;
}

export function getUnitRangeSizes(
  unit: SizeUnit = 'US',
  minSize: string,
  maxSize: string,
  isHalfStep: boolean = true
): string[] {
  const allSizes = UNIT_ALL_SIZES[unit] || UNIT_ALL_SIZES.US;
  if (allSizes.length === 0) return [];

  const effectiveSizes = !isHalfStep && unit !== 'ALPHA' ? allSizes.filter(isWholeSizeKey) : allSizes;
  if (effectiveSizes.length === 0) return [];

  const normMin = normalizeSizeKey(unit, minSize);
  const normMax = normalizeSizeKey(unit, maxSize);

  // ALPHA categorical sequence
  if (unit === 'ALPHA') {
    let startIdx = allSizes.indexOf(normMin);
    let endIdx = allSizes.indexOf(normMax);
    if (startIdx === -1) startIdx = 0;
    if (endIdx === -1) endIdx = allSizes.length - 1;
    if (startIdx > endIdx) {
      const temp = startIdx;
      startIdx = endIdx;
      endIdx = temp;
    }
    return allSizes.slice(startIdx, endIdx + 1);
  }

  // Numeric sequences (US, EU, CM)
  const findIdx = (val: string, fallbackIdx: number): number => {
    if (!val) return fallbackIdx;
    const direct = effectiveSizes.indexOf(val);
    if (direct !== -1) return direct;
    const valNum = parseFloat(val);
    if (!isNaN(valNum)) {
      const numIdx = effectiveSizes.findIndex((s) => Math.abs(parseFloat(s) - valNum) < 0.05);
      if (numIdx !== -1) return numIdx;
      const firstNum = parseFloat(effectiveSizes[0]);
      const lastNum = parseFloat(effectiveSizes[effectiveSizes.length - 1]);
      if (valNum <= firstNum) return 0;
      if (valNum >= lastNum) return effectiveSizes.length - 1;
      let closestIdx = 0;
      let minDiff = Infinity;
      effectiveSizes.forEach((s, idx) => {
        const diff = Math.abs(parseFloat(s) - valNum);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      return closestIdx;
    }
    return fallbackIdx;
  };

  let startIdx = findIdx(normMin, 0);
  let endIdx = findIdx(normMax, effectiveSizes.length - 1);

  if (startIdx > endIdx) {
    const temp = startIdx;
    startIdx = endIdx;
    endIdx = temp;
  }

  return effectiveSizes.slice(startIdx, endIdx + 1);
}

export function detectProductMinMax(variants: ShoeVariant[] = [], unit: SizeUnit = 'US'): { min: string; max: string } {
  const allSizes = UNIT_ALL_SIZES[unit] || UNIT_ALL_SIZES.US;
  const defaultRange = DEFAULT_UNIT_RANGES[unit] || { min: allSizes[0], max: allSizes[allSizes.length - 1] };

  if (!variants || variants.length === 0) {
    return { ...defaultRange };
  }

  if (unit === 'ALPHA') {
    const alphaIndices: number[] = [];
    variants.forEach((v) => {
      const display = (v.sizeDisplay || '').trim().toUpperCase();
      const norm = display === 'LL' ? '2L' : display === 'XXL' ? '2XL' : display;
      const idx = allSizes.indexOf(norm);
      if (idx !== -1) {
        alphaIndices.push(idx);
      }
    });

    if (alphaIndices.length === 0) {
      return { ...defaultRange };
    }

    const minIdx = Math.min(...alphaIndices);
    const maxIdx = Math.max(...alphaIndices);
    return { min: allSizes[minIdx], max: allSizes[maxIdx] };
  }

  const validNums: number[] = [];
  variants.forEach((v) => {
    let num: number | null = null;
    if (unit === 'US') {
      if (typeof v.sizeUS === 'number' && v.sizeUS > 0) {
        num = v.sizeUS;
      } else if (v.sizeDisplay) {
        const parsed = parseFloat(v.sizeDisplay.replace(/[^\d.]/g, ''));
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) num = parsed;
      }
    } else if (unit === 'EU') {
      if (typeof v.sizeEU === 'number' && v.sizeEU >= 20) {
        num = v.sizeEU;
      } else if (v.sizeDisplay) {
        const parsed = parseFloat(v.sizeDisplay.replace(/[^\d.]/g, ''));
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 55) num = parsed;
      } else if (typeof v.sizeUS === 'number' && v.sizeUS > 0) {
        const resolved = resolveVariantSize(v.sizeUS.toFixed(1), 'US');
        if (resolved.sizeEU >= 20) num = resolved.sizeEU;
      }
    } else if (unit === 'CM') {
      if (typeof v.sizeCM === 'number' && v.sizeCM >= 10) {
        num = v.sizeCM;
      } else if (v.sizeDisplay) {
        const parsed = parseFloat(v.sizeDisplay.replace(/[^\d.]/g, ''));
        if (!isNaN(parsed) && parsed >= 10 && parsed <= 35) num = parsed;
      } else if (typeof v.sizeUS === 'number' && v.sizeUS > 0) {
        const resolved = resolveVariantSize(v.sizeUS.toFixed(1), 'US');
        if (resolved.sizeCM >= 10) num = resolved.sizeCM;
      }
    }

    if (num !== null && !isNaN(num)) {
      validNums.push(num);
    }
  });

  if (validNums.length === 0) {
    return { ...defaultRange };
  }

  const minNum = Math.min(...validNums);
  const maxNum = Math.max(...validNums);

  const matchSize = (targetNum: number) => {
    const exact = allSizes.find((s) => Math.abs(parseFloat(s) - targetNum) < 0.05);
    if (exact) return exact;
    if (targetNum <= parseFloat(allSizes[0])) return allSizes[0];
    if (targetNum >= parseFloat(allSizes[allSizes.length - 1])) return allSizes[allSizes.length - 1];
    let closest = allSizes[0];
    let minDiff = Infinity;
    allSizes.forEach((s) => {
      const diff = Math.abs(parseFloat(s) - targetNum);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    });
    return closest;
  };

  return {
    min: matchSize(minNum),
    max: matchSize(maxNum),
  };
}

/**
 * Format the size range for a product (e.g. "37 ～ 41", "US 8.0 ～ 10.5", "S ～ 2XL")
 */
export function formatProductSizeRange(prod: ProductWithVariants): string {
  const unit = prod.sizeUnit || getProductSizeUnit(prod);
  let min = prod.minSize;
  let max = prod.maxSize;

  if (!min || !max) {
    if (!prod.variants || prod.variants.length === 0) return '';
    const bounds = detectProductMinMax(prod.variants, unit);
    min = min || bounds.min;
    max = max || bounds.max;
  }

  if (!min && !max) return '';
  const finalMin = min || max;
  const finalMax = max || min;

  if (finalMin === finalMax) {
    if (unit === 'US' && !finalMin.toUpperCase().startsWith('US') && !finalMin.endsWith('C') && !finalMin.endsWith('Y')) {
      return `US ${finalMin}`;
    }
    if (unit === 'CM' && !finalMin.endsWith('cm')) {
      return `${finalMin} cm`;
    }
    return finalMin;
  }

  const prefix = (unit === 'US' && !finalMin.toUpperCase().startsWith('US') && !finalMin.endsWith('C') && !finalMin.endsWith('Y')) ? 'US ' : '';
  const suffix = (unit === 'CM' && !finalMax.endsWith('cm')) ? ' cm' : '';

  return `${prefix}${finalMin} ～ ${finalMax}${suffix}`;
}

/**
 * Detect whether a product uses half-step (0.5) or whole-step (1.0) sizing intervals.
 * 1. If prod.isHalfStep is explicitly set, return that.
 * 2. If unit is 'ALPHA', intervals do not apply (treated as true/full list).
 * 3. Smart detection:
 *    - Check minSize, maxSize, and any existing variants.
 *    - If any of them contains a fractional number (e.g. 41.5, 8.5), return true (half-step).
 *    - If min/max exist and all are whole numbers without fractional variants, return false (whole-step).
 */
export function detectProductIsHalfStep(prod: ProductWithVariants): boolean {
  if (typeof prod.isHalfStep === 'boolean') {
    return prod.isHalfStep;
  }
  const unit = prod.sizeUnit || getProductSizeUnit(prod);
  if (unit === 'ALPHA') return true;

  const checkHasFraction = (s?: string | number) => {
    if (s === undefined || s === null) return false;
    const str = String(s);
    const num = parseFloat(str.replace(/[^\d.]/g, ''));
    return !isNaN(num) && num % 1 !== 0;
  };

  if (checkHasFraction(prod.minSize) || checkHasFraction(prod.maxSize)) {
    return true;
  }

  if (prod.variants && prod.variants.length > 0) {
    const hasFraction = prod.variants.some((v) => {
      if (unit === 'EU') {
        if (checkHasFraction(v.sizeEU)) return true;
        if (v.sizeDisplay && checkHasFraction(v.sizeDisplay)) return true;
        return false;
      }
      if (unit === 'CM') {
        if (checkHasFraction(v.sizeCM)) return true;
        if (v.sizeDisplay && checkHasFraction(v.sizeDisplay)) return true;
        return false;
      }
      // For US unit or default
      if (v.sizeDisplay && checkHasFraction(v.sizeDisplay)) return true;
      return typeof v.sizeUS === 'number' && v.sizeUS > 0 && v.sizeUS % 1 !== 0;
    });
    if (hasFraction) return true;
  }

  if (prod.minSize && prod.maxSize && !checkHasFraction(prod.minSize) && !checkHasFraction(prod.maxSize)) {
    return false;
  }

  return true;
}

/**
 * Generates the complete list of ShoeVariants for display in inventory cards:
 * 1. Spans from minSize to maxSize (using getUnitRangeSizes with the detected isHalfStep).
 * 2. Pairs each size in the range with its existing variant in prod.variants (preserving stock, batches, id).
 * 3. If a size in the range has no existing variant, creates a placeholder variant with stock: 0.
 * 4. Ensures any variant already in prod.variants with stock > 0 is ALWAYS included (even if outside range or step).
 * 5. Sorts the resulting list ascending by size rank.
 */
export function getProductFullDisplayVariants(prod: ProductWithVariants): ShoeVariant[] {
  const unit = prod.sizeUnit || getProductSizeUnit(prod);
  const isHalf = detectProductIsHalfStep(prod);

  let min = prod.minSize;
  let max = prod.maxSize;
  if (!min || !max) {
    const bounds = detectProductMinMax(prod.variants, unit);
    min = min || bounds.min;
    max = max || bounds.max;
  }

  const rangeSizes = (min && max) ? getUnitRangeSizes(unit, min, max, isHalf) : [];
  const result: ShoeVariant[] = [];
  const matchedVariantIds = new Set<string>();

  rangeSizes.forEach((sizeKey) => {
    const existing = prod.variants.find((v) => !matchedVariantIds.has(v.id) && isSameSizeVariant(v, sizeKey));
    if (existing) {
      result.push(existing);
      matchedVariantIds.add(existing.id);
    } else {
      const resolved = resolveVariantSize(sizeKey, unit);
      result.push({
        id: `synthetic-${prod.id}-${encodeURIComponent(sizeKey).replace(/%/g, '_')}`,
        productId: prod.id,
        sizeUS: resolved.sizeUS,
        sizeEU: resolved.sizeEU,
        sizeCM: resolved.sizeCM,
        sizeDisplay: resolved.sizeDisplay,
        stock: 0,
      });
    }
  });

  // Rule 14: Ensure any existing variant with stock > 0 is NEVER hidden
  prod.variants.forEach((v) => {
    if (!matchedVariantIds.has(v.id) && v.stock > 0) {
      result.push(v);
      matchedVariantIds.add(v.id);
    }
  });

  return result.sort(
    (a, b) => getSegmentSortRank(a.sizeDisplay, a.sizeUS) - getSegmentSortRank(b.sizeDisplay, b.sizeUS)
  );
}



