import { StationTrackInfo } from '../types/station';
import { fetchWithFallbackProxy } from './radioService';

const KAN_STATION_IDS: { [key: string]: string } = {
    'כאן ב': '954', 'כאן גימל': '955', 'כאן 88': '956', 'כאן תרבות': '957', 'כאן קול המוזיקה': '958', 'כאן מורשת': '959',
};

const GLZ_SLUGS: { [key: string]: string } = {
    'גלגלצ': 'glglz', 'גלי צה"ל': 'glz',
};

export const hasSpecificHandler = (stationName: string): boolean => {
    const low = stationName.toLowerCase();
    return Object.keys(GLZ_SLUGS).some(k => low.includes(k.toLowerCase())) ||
           Object.keys(KAN_STATION_IDS).some(k => low.includes(k.toLowerCase())) ||
           low.includes('eco99fm') || low.includes('99fm') || low.includes('99 fm');
};

const fetchKanTrackInfo = async (stationName: string): Promise<StationTrackInfo | null> => {
    const low = stationName.toLowerCase();
    const id = Object.keys(KAN_STATION_IDS).find(k => low.includes(k.toLowerCase())) ? KAN_STATION_IDS[Object.keys(KAN_STATION_IDS).find(k => low.includes(k.toLowerCase()))!] : null;
    if (!id) return null;
    try {
        const res = await fetchWithFallbackProxy(`https://www.kan.org.il/radio/live-info-v2.aspx?stationId=${id}`, { disableCacheBust: true });
        if (!res.ok) return null;
        const data = JSON.parse(await res.text());
        return data?.title ? { program: data.title, current: data.description !== data.title ? data.description : null, next: null } : null;
    } catch (e) { return null; }
};

const fetchGaleiTzahalScheduleInfo = async (): Promise<{ program: string | null; presenters: string | null }> => {
    try {
        const res = await fetchWithFallbackProxy(`https://glz.co.il/umbraco/api/header/GetCommonData?rootId=1051`);
        if (!res.ok) return { program: null, presenters: null };
        const data = JSON.parse(await res.text());
        const today = data?.timeTable?.glzTimeTable?.find((day: any) => day.isToday);
        const now = new Date();
        const current = today?.programmes?.find((p: any) => now >= new Date(p.start) && now < new Date(p.end));
        return current ? { program: current.topText?.trim() || null, presenters: current.bottomText?.trim() || null } : { program: null, presenters: null };
    } catch (e) { return { program: null, presenters: null }; }
};

const fetchGaleiTzahalCombinedInfo = async (stationName: string): Promise<StationTrackInfo | null> => {
    const low = stationName.toLowerCase();
    const slug = Object.keys(GLZ_SLUGS).find(k => low.includes(k.toLowerCase())) ? GLZ_SLUGS[Object.keys(GLZ_SLUGS).find(k => low.includes(k.toLowerCase()))!] : null;
    if (!slug) return null;

    const fetchXml = async () => {
        try {
            const res = await fetchWithFallbackProxy(`https://glzxml.blob.core.windows.net/dalet/${slug}-onair/onair.xml`);
            if (!res.ok) return { current: null, next: null };
            const doc = new DOMParser().parseFromString(await res.text(), "text/xml");
            const extract = (p: 'Current' | 'Next') => {
                const t = doc.querySelector(`BroadcastMonitor > ${p} > titleName`)?.textContent?.trim();
                const a = doc.querySelector(`BroadcastMonitor > ${p} > artistName`)?.textContent?.trim();
                return t ? (a ? `${t} - ${a}` : t) : null;
            };
            return { current: extract('Current'), next: extract('Next') };
        } catch (e) { return { current: null, next: null }; }
    };

    const fetchJson = async () => {
        try {
            const res = await fetchWithFallbackProxy(`https://glz.co.il/umbraco/api/player/UpdatePlayer?stationid=${slug}`);
            return res.ok ? JSON.parse(await res.text())?.program?.trim() || null : null;
        } catch (e) { return null; }
    };

    const [songs, programData] = await Promise.all([fetchXml(), slug === 'glz' ? fetchGaleiTzahalScheduleInfo() : fetchJson()]);
    let prog = typeof programData === 'string' ? programData : (programData?.program || programData?.presenters);
    return { program: prog, current: songs.current, next: songs.next };
};

const fetchEco99fmTrackInfo = async (): Promise<StationTrackInfo | null> => {
    try {
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/eco-99-production/databases/(default)/documents/streamed_content/program`, { cache: 'no-cache' });
        if (!res.ok) return null;
        const f = (await res.json())?.fields;
        const p = f?.program_name?.stringValue;
        const c = f?.song_name?.stringValue && f?.artist_name?.stringValue ? `${f.song_name.stringValue} - ${f.artist_name.stringValue}` : f?.song_name?.stringValue;
        return { program: p, current: c, next: null };
    } catch (e) { return null; }
};

export const fetchStationSpecificTrackInfo = async (stationName: string): Promise<StationTrackInfo | null> => {
    const low = stationName.toLowerCase();
    if (Object.keys(GLZ_SLUGS).some(k => low.includes(k.toLowerCase()))) return fetchGaleiTzahalCombinedInfo(stationName);
    if (Object.keys(KAN_STATION_IDS).some(k => low.includes(k.toLowerCase()))) return fetchKanTrackInfo(stationName);
    if (low.includes('eco99fm') || low.includes('99fm')) return fetchEco99fmTrackInfo();
    return null;
};
