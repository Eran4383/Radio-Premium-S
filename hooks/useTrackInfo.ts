import { useState, useEffect } from 'react';
import { Station, StationTrackInfo } from '../types/station';
import { fetchLiveTrackInfo } from '../services/radioService';
import { getCurrentProgram } from '../services/scheduleService';
import { fetchStationSpecificTrackInfo, hasSpecificHandler } from '../services/stationSpecificService';

export const useTrackInfo = (station: Station | null) => {
  const [trackInfo, setTrackInfo] = useState<StationTrackInfo | null>(null);

  useEffect(() => {
    let intervalId: number;
    const fetchAndSetInfo = async () => {
      if (!station) return;
      const { name, aliases = [], stationuuid } = station;
      const candidateNames = [name, ...aliases].map(n => n.trim()).filter(Boolean);
      const matchedSpecificName = candidateNames.find(n => hasSpecificHandler(n));
      let finalInfo: StationTrackInfo | null = null;

      if (matchedSpecificName) {
        const specificInfo = await fetchStationSpecificTrackInfo(matchedSpecificName);
        finalInfo = specificInfo ? { ...specificInfo } : { program: null, current: null, next: null };
        if (!finalInfo.program) {
          for (const candidate of candidateNames) {
            const prog = getCurrentProgram(candidate);
            if (prog) {
              finalInfo.program = prog;
              break;
            }
          }
        }
      } else {
        const songTitle = await fetchLiveTrackInfo(stationuuid);
        let programName: string | null = null;
        for (const candidate of candidateNames) {
          programName = getCurrentProgram(candidate);
          if (programName) break;
        }
        const current =
          songTitle && !candidateNames.some(c => c.toLowerCase() === songTitle.toLowerCase())
            ? songTitle
            : null;
        finalInfo = { program: programName, current, next: null };
      }
      setTrackInfo(finalInfo);
    };

    if (station) {
      fetchAndSetInfo();
      intervalId = window.setInterval(fetchAndSetInfo, 20000);
    } else {
      setTrackInfo(null);
    }

    return () => clearInterval(intervalId);
  }, [station]);

  return { trackInfo };
};
