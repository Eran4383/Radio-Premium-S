export interface Station {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  countrycode: string;
  codec: string;
  bitrate: number;
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
