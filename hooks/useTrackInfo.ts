import { useState, useEffect } from 'react';
import { Station, StationTrackInfo, SmartPlaylistItem } from '../types/station';
import { fetchLiveTrackInfo, fetch100fmPlaylist } from '../services/radioService';
import { getCurrentProgram } from '../services/scheduleService';
import { fetchStationSpecificTrackInfo, hasSpecificHandler } from '../services/stationSpecificService';

export const useTrackInfo = (station: Station | null, is100fmSmartPlayerEnabled: boolean) => {
  const [trackInfo, setTrackInfo] = useState<StationTrackInfo | null>(null);
  const [smartPlaylist, setSmartPlaylist] = useState<SmartPlaylistItem[]>([]);

  useEffect(() => {
    let intervalId: number;
    const fetchAndSetInfo = async () => {
      if (!station) return;
      const { name, stationuuid, url_resolved } = station;
      let finalInfo: StationTrackInfo | null = null;

      if (is100fmSmartPlayerEnabled && (stationuuid.startsWith('100fm-') || url_resolved.includes('streamgates.net'))) {
        const playlist = await fetch100fmPlaylist(stationuuid);
        setSmartPlaylist(playlist);
        if (playlist.length > 0) {
          const now = Math.floor(Date.now() / 1000);
          const currentItem = [...playlist].reverse().find(i => i.timestamp <= now + 5);
          const nextItem = playlist.find(i => i.timestamp > now + 5);
          finalInfo = {
            program: name,
            current: currentItem ? `${currentItem.name} - ${currentItem.artist}` : null,
            next: nextItem ? `${nextItem.name} - ${nextItem.artist}` : null
          };
        } else {
          finalInfo = { program: name, current: null, next: null };
        }
      } else {
        setSmartPlaylist([]);
        if (hasSpecificHandler(name)) {
          const specificInfo = await fetchStationSpecificTrackInfo(name);
          finalInfo = specificInfo ? { ...specificInfo } : { program: null, current: null, next: null };
          if (!finalInfo.program) finalInfo.program = getCurrentProgram(name);
        } else {
          const [songTitle, programName] = await Promise.all([fetchLiveTrackInfo(stationuuid), getCurrentProgram(name)]);
          const current = songTitle && songTitle.toLowerCase() !== name.toLowerCase() ? songTitle : null;
          finalInfo = { program: programName, current, next: null };
        }
      }
      setTrackInfo(finalInfo);
    };

    if (station) {
      fetchAndSetInfo();
      intervalId = window.setInterval(fetchAndSetInfo, 20000);
    } else {
      setTrackInfo(null);
      setSmartPlaylist([]);
    }

    return () => clearInterval(intervalId);
  }, [station, is100fmSmartPlayerEnabled]);

  return { trackInfo, smartPlaylist };
};
