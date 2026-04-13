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
      const { name, stationuuid } = station;
      let finalInfo: StationTrackInfo | null = null;

      if (hasSpecificHandler(name)) {
        const specificInfo = await fetchStationSpecificTrackInfo(name);
        finalInfo = specificInfo ? { ...specificInfo } : { program: null, current: null, next: null };
        if (!finalInfo.program) finalInfo.program = getCurrentProgram(name);
      } else {
        const [songTitle, programName] = await Promise.all([fetchLiveTrackInfo(stationuuid), getCurrentProgram(name)]);
        const current = songTitle && songTitle.toLowerCase() !== name.toLowerCase() ? songTitle : null;
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
