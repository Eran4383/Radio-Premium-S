import { Station, SmartPlaylistItem } from '../types/station';
import { PRIORITY_STATIONS, CORS_PROXY_URL } from '../config/constants';
import { fetchCustomStations } from './settingsService';

const shuffleArray = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export interface ProxyOptions extends RequestInit {
    disableCacheBust?: boolean;
}

export const fetchWithFallbackProxy = async (url: string, options: ProxyOptions = {}): Promise<Response> => {
    const { disableCacheBust, ...fetchOptions } = options;
    const cacheBust = disableCacheBust ? '' : `${url.includes('?') ? '&' : '?' }t=${Date.now()}`;
    
    const proxies = [
        `${CORS_PROXY_URL}${url}${cacheBust}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url + cacheBust)}`,
        `https://thingproxy.freeboard.io/fetch/${url}${cacheBust}`,
        `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url + cacheBust)}`
    ];
    
    let lastError: any;
    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl, { ...fetchOptions, cache: 'no-cache' });
            if (response.ok) return response;
            console.warn(`Proxy failed: ${proxyUrl.split('?')[0]} with status ${response.status}`);
        } catch (e) {
            lastError = e;
            console.warn(`Proxy error: ${proxyUrl.split('?')[0]}`, e);
        }
    }
    
    throw lastError || new Error(`All proxies failed for ${url}`);
};

const API_SERVERS = [
    'https://de1.api.radio-browser.info/json',
    'https://nl1.api.radio-browser.info/json',
    'https://fr1.api.radio-browser.info/json',
    'https://at1.api.radio-browser.info/json',
    'https://radio.cloud-api.online/json',
    'https://de2.api.radio-browser.info/json',
];

const fetchRadioBrowserStations = async (): Promise<Station[]> => {
  const servers = shuffleArray([...API_SERVERS]);
  for (const serverUrl of servers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const url = `${serverUrl}/stations/bycountrycodeexact/IL?limit=300&hidebroken=true`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) continue;
      const data: Station[] = await response.json();
      if (data && data.length > 0) return data;
    } catch (error: any) {}
  }
  return [];
};

const fetch100fmStations = async (): Promise<Station[]> => {
  const url = 'https://digital.100fm.co.il/app/';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetchWithFallbackProxy(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data || !Array.isArray(data.stations)) return [];
    return data.stations.map((s: any) => ({
      stationuuid: `100fm-${s.slug}`,
      name: s.name,
      url_resolved: s.audioA || s.audio,
      favicon: s.cover || s.logo,
      tags: s.description?.split('\n')[0] || s.name,
      countrycode: 'IL',
      codec: 'AAC',
      bitrate: 128,
      sliders: s.sliders || [],
    })).filter((s: any) => s.url_resolved);
  } catch (error) {
    return [];
  }
};

export const fetchDefaultIsraeliStations = async (): Promise<Station[]> => {
  const [rb, fm] = await Promise.allSettled([fetchRadioBrowserStations(), fetch100fmStations()]);
  let all: Station[] = [];
  if (rb.status === 'fulfilled') all = all.concat(rb.value);
  if (fm.status === 'fulfilled') all = all.concat(fm.value);
  if (all.length === 0) return [];

  const unique = new Map<string, Station>();
  const getCanonical = (name: string): string | null => {
      const low = name.toLowerCase();
      for (const p of PRIORITY_STATIONS) {
          if (p.aliases.some(a => low.includes(a.toLowerCase()))) return p.name;
      }
      return null;
  };

  all.forEach(s => {
      if (s.url_resolved && s.favicon && s.name) {
          const can = getCanonical(s.name);
          const key = can || s.name.toLowerCase().trim().replace(/\s*fm\s*$/, '').replace(/[^a-z0-9\u0590-\u05FF]/g, '');
          const existing = unique.get(key);
          if (!existing || s.bitrate > existing.bitrate || (s.bitrate === existing.bitrate && s.stationuuid.startsWith('100fm-') && !existing.stationuuid.startsWith('100fm-'))) {
              if (can) s.name = can;
              unique.set(key, s);
          }
      }
  });
  return Array.from(unique.values());
};

export const fetchStations = async (): Promise<Station[]> => {
    try {
        const custom = await fetchCustomStations();
        if (custom && Array.isArray(custom)) return custom;
    } catch (e) {}
    return fetchDefaultIsraeliStations();
};

export const fetchLiveTrackInfo = async (stationuuid: string): Promise<string | null> => {
    const servers = shuffleArray([...API_SERVERS]);
    for (const serverUrl of servers) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const url = `${serverUrl}/stations/check?uuids=${stationuuid}`;
            const response = await fetchWithFallbackProxy(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) continue;
            const data = await response.json();
            if (data && data.length > 0) {
                const title = data[0].now_playing?.song?.title || data[0].title;
                if (title) return title;
            }
        } catch (error) {}
    }
    return null;
};

export const fetch100fmPlaylist = async (stationIdOrSlug: string): Promise<SmartPlaylistItem[]> => {
    const slug = stationIdOrSlug.replace('100fm-', '');
    const url = `https://digital.100fm.co.il/api/nowplaying/${slug}/12`;
    try {
        const response = await fetchWithFallbackProxy(url, { headers: { 'Accept': 'application/xml, text/xml, */*' } });
        if (!response.ok) return [];
        const text = await response.text();
        const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
        const trackElements = xmlDoc.getElementsByTagName('track');
        const playlist: SmartPlaylistItem[] = [];
        for (let i = 0; i < trackElements.length; i++) {
            const track = trackElements[i];
            const artist = track.getElementsByTagName('artist')[0]?.textContent || '';
            const name = track.getElementsByTagName('name')[0]?.textContent || '';
            const timestamp = parseInt(track.getElementsByTagName('timestamp')[0]?.textContent || '0', 10);
            const before = parseInt(track.getElementsByTagName('before')[0]?.textContent || '0', 10);
            if (timestamp > 0) playlist.push({ artist, name, timestamp, before });
        }
        return playlist.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
        return [];
    }
};
