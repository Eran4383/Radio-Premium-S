export interface Station {
  stationuuid: string;
  name: string;
  aliases?: string[];
  url_resolved: string;
  favicon: string;
  tags: string;
  countrycode: string;
  codec: string;
  bitrate: number;
  sliders?: { audio: string; info: string }[];
}

export interface StationTrackInfo {
    program: string | null;
    current: string | null;
    next: string | null;
}

export interface SmartPlaylistItem {
    artist: string;
    name: string;
    timestamp: number; // Unix timestamp in seconds
    before: number;
}

export interface ArchivedNonHttpsStation {
    id: string;
    station: Station;
    deletedAt: number;
    reason: string;
    deletedBy?: string | null;
    lastCheckedAt?: number;
}

export interface StationAdminMeta {
    archivedNonHttps: ArchivedNonHttpsStation[];
    ignoredDuplicatePairs: string[];
    lastBulkCheckAt: number | null;
}

