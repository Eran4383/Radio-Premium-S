import Hls from 'hls.js';
import { Station } from '../types/station';
import { PRIORITY_STATIONS } from '../config/constants';

export interface StationHttpsIssues {
  streamIsHttp: boolean;
  faviconIsHttp: boolean;
  missingStream: boolean;
  missingFavicon: boolean;
  hasHttpsIssue: boolean;
  hasAnyIssue: boolean;
}

export const getStationHttpsIssues = (station: Station): StationHttpsIssues => {
  const stream = (station.url_resolved || '').trim().toLowerCase();
  const favicon = (station.favicon || '').trim().toLowerCase();

  const missingStream = !stream;
  const missingFavicon = !favicon;
  const streamIsHttp = stream.startsWith('http://');
  const faviconIsHttp = favicon.startsWith('http://');

  return {
    streamIsHttp,
    faviconIsHttp,
    missingStream,
    missingFavicon,
    hasHttpsIssue: streamIsHttp || faviconIsHttp,
    hasAnyIssue: streamIsHttp || faviconIsHttp || missingStream || missingFavicon,
  };
};

export interface LinkTestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
}

export const testStreamUrl = (url: string, timeoutMs = 6500): Promise<LinkTestResult> => {
  const trimmed = url.trim();
  if (!trimmed) {
    return Promise.resolve({ ok: false, message: 'כתובת השידור ריקה', latencyMs: 0 });
  }

  const start = Date.now();

  return new Promise((resolve) => {
    let settled = false;
    let hls: Hls | null = null;
    const audio = document.createElement('audio');
    audio.muted = true;
    audio.volume = 0;
    audio.preload = 'metadata';

    const cleanup = () => {
      if (hls) {
        try { hls.destroy(); } catch {}
        hls = null;
      }
      audio.onloadedmetadata = null;
      audio.oncanplay = null;
      audio.onerror = null;
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {}
    };

    const finish = (ok: boolean, message: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      cleanup();
      resolve({ ok, message, latencyMs: Date.now() - start });
    };

    const timerId = window.setTimeout(() => {
      finish(false, 'פג זמן ההמתנה (Timeout)');
    }, timeoutMs);

    const isHls = trimmed.toLowerCase().includes('.m3u8');
    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: false, lowLatencyMode: true });
      hls.loadSource(trimmed);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        finish(true, 'זרם HLS תקין ונגיש');
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          finish(false, `שגיאת HLS (${data.details || 'חיבור נכשל'})`);
        }
      });
      return;
    }

    audio.onloadedmetadata = () => finish(true, 'השידור זמין ותקין');
    audio.oncanplay = () => finish(true, 'השידור זמין ותקין');
    audio.onerror = () => {
      const code = audio.error?.code;
      if (code === 4) {
        finish(false, 'פורמט לא נתמך או שכתובת השידור לא זמינה');
      } else {
        finish(false, 'לא ניתן להתחבר לכתובת השידור');
      }
    };

    audio.src = trimmed;
    try {
      audio.load();
    } catch {
      finish(false, 'כתובת אינה תקינה');
    }
  });
};

export interface ImageTestResult {
  ok: boolean;
  width?: number;
  height?: number;
  message: string;
}

export const testImageUrl = (url: string, timeoutMs = 5000): Promise<ImageTestResult> => {
  const trimmed = url.trim();
  if (!trimmed) {
    return Promise.resolve({ ok: false, message: 'כתובת הלוגו ריקה' });
  }

  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();

    const finish = (result: ImageTestResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      img.onload = null;
      img.onerror = null;
      resolve(result);
    };

    const timerId = window.setTimeout(() => {
      finish({ ok: false, message: 'פג זמן טעינת התמונה' });
    }, timeoutMs);

    img.onload = () => {
      finish({
        ok: true,
        width: img.naturalWidth,
        height: img.naturalHeight,
        message: `תקין (${img.naturalWidth}x${img.naturalHeight})`,
      });
    };
    img.onerror = () => {
      finish({ ok: false, message: 'התמונה לא נטענה מהקישור' });
    };

    img.src = trimmed;
  });
};

// --- Safe Duplicate Detection ---

export type DuplicateReason = 'exact_url' | 'same_favicon' | 'similar_name';

export interface DuplicateGroup {
  id: string;
  reason: DuplicateReason;
  confidence: 'high' | 'medium';
  reasonLabel: string;
  warningText?: string;
  stations: Station[];
}

const normalizeUrlForComparison = (url: string): string => {
  return (url || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
};

const SUBCHANNEL_TOKENS = [
  'דאנס', 'מזרחית', 'נוסטלגיה', 'רוק', 'פופ', 'גאז', "ג'אז", 'קלאסי', 'ילדים',
  'ספורט', 'חדשות', 'עסקים', 'תרבות', 'מורשת', 'רקע', 'ים תיכוני', 'להיטים',
  'dance', 'hits', 'rock', 'pop', 'chill', 'kids', 'jazz', 'classic', '80s', '90s', '70s',
  'workout', 'retro', 'oriental', 'hiphop', 'hip-hop', 'chillout', 'party', 'love', 'arabic',
  'א', 'ב', 'ג', 'גימל', 'ד', 'מכאן',
];

const extractNumericTokens = (name: string): string[] => {
  const matches = name.match(/\d+(?:\.\d+)?/g);
  return matches ? [...new Set(matches)].sort() : [];
};

const extractSubchannelTokens = (name: string): string[] => {
  const low = name.toLowerCase().replace(/["'״׳]/g, '');
  const found: string[] = [];
  for (const token of SUBCHANNEL_TOKENS) {
    // Match whole word/token boundaries for short Hebrew letters
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[\\s\\-_/|])${escaped}([\\s\\-_/|]|$)`, 'i');
    if (regex.test(low)) {
      found.push(token);
    }
  }
  return found.sort();
};

const normalizeStationNameCore = (name: string): string => {
  return (name || '')
    .toLowerCase()
    .replace(/["'״׳]/g, '')
    .replace(/\b(radio|fm|am|israel|live|online|stream|hd)\b/gi, '')
    .replace(/(רדיו|שידור חי|ישראל|אונליין|אפ אם|אפ\.אם)/g, '')
    .replace(/[^a-z0-9\u0590-\u05FF]/g, '');
};

const getPriorityCanonical = (name: string): string | null => {
  const low = name.toLowerCase();
  for (const p of PRIORITY_STATIONS) {
    if (p.aliases.some(a => low.includes(a.toLowerCase()))) {
      return p.name;
    }
  }
  return null;
};

export const findPotentialDuplicates = (stations: Station[]): DuplicateGroup[] => {
  const groups: DuplicateGroup[] = [];
  const pairedKeys = new Set<string>();

  const pairKey = (a: Station, b: Station) =>
    [a.stationuuid, b.stationuuid].sort().join('::');

  const markPairs = (list: Station[]) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pairedKeys.add(pairKey(list[i], list[j]));
      }
    }
  };

  // 1. Exact stream URL match (ignoring http vs https and trailing slashes)
  const byStreamUrl = new Map<string, Station[]>();
  for (const s of stations) {
    const norm = normalizeUrlForComparison(s.url_resolved);
    if (!norm) continue;
    const arr = byStreamUrl.get(norm) || [];
    arr.push(s);
    byStreamUrl.set(norm, arr);
  }
  byStreamUrl.forEach((list, normUrl) => {
    if (list.length > 1) {
      markPairs(list);
      groups.push({
        id: `url:${normUrl}`,
        reason: 'exact_url',
        confidence: 'high',
        reasonLabel: 'כתובת שידור זהה',
        stations: list,
      });
    }
  });

  // 2. Same favicon URL (excluding empty / placeholder URLs)
  const byFavicon = new Map<string, Station[]>();
  for (const s of stations) {
    const norm = normalizeUrlForComparison(s.favicon);
    if (!norm || norm.includes('picsum.photos')) continue;
    const arr = byFavicon.get(norm) || [];
    arr.push(s);
    byFavicon.set(norm, arr);
  }
  byFavicon.forEach((list, normIcon) => {
    if (list.length > 1) {
      // Check if all pairs are already captured by exact_url
      let hasNewPair = false;
      for (let i = 0; i < list.length && !hasNewPair; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (!pairedKeys.has(pairKey(list[i], list[j]))) {
            hasNewPair = true;
            break;
          }
        }
      }
      if (hasNewPair) {
        markPairs(list);
        groups.push({
          id: `icon:${normIcon}`,
          reason: 'same_favicon',
          confidence: 'medium',
          reasonLabel: 'אותו לוגו (תמונה זהה)',
          warningText: 'תחנות שמשתפות אותו לוגו עשויות להיות כפילות, או ערוצי משנה של אותה רשת. מומלץ להאזין לפני מחיקה.',
          stations: list,
        });
      }
    }
  });

  // 3. Similar name (with strict guard against distinct sub-channels or different FM numbers)
  const bySimilarKey = new Map<string, Station[]>();
  for (const s of stations) {
    const core = normalizeStationNameCore(s.name);
    const nums = extractNumericTokens(s.name).join(',');
    const subs = extractSubchannelTokens(s.name).join(',');
    const canonical = getPriorityCanonical(s.name);

    // If it matches a known canonical station AND has no conflicting sub-channel token, group under canonical
    // Otherwise group under core+nums+subs
    let key = '';
    if (canonical && subs === '') {
      key = `canon:${canonical}|${nums}`;
    } else if (core.length >= 2) {
      key = `core:${core}|${nums}|${subs}`;
    }

    if (!key) continue;
    const arr = bySimilarKey.get(key) || [];
    arr.push(s);
    bySimilarKey.set(key, arr);
  }

  bySimilarKey.forEach((list, key) => {
    if (list.length > 1) {
      let hasNewPair = false;
      for (let i = 0; i < list.length && !hasNewPair; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (!pairedKeys.has(pairKey(list[i], list[j]))) {
            hasNewPair = true;
            break;
          }
        }
      }
      if (hasNewPair) {
        markPairs(list);
        groups.push({
          id: `name:${key}`,
          reason: 'similar_name',
          confidence: 'medium',
          reasonLabel: 'שם תחנה דומה',
          warningText: 'בדיקה לפי דמיון שם בלבד — ייתכן שמדובר במקורות שונים לאותה תחנה או בתחנות שונות. האזן לשתיהן לפני מחיקה.',
          stations: list,
        });
      }
    }
  });

  return groups.sort((a, b) => (a.confidence === 'high' ? -1 : 1) - (b.confidence === 'high' ? -1 : 1));
};
