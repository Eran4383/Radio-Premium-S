import { useReducer, useState, useCallback } from 'react';
import { Station } from '../types/station';
import { SmartPlaylistItem } from '../types';
import { playerReducer, initialPlayerState } from '../store/playerReducer';

export const usePlayer = (displayedStations: Station[]) => {
  const [playerState, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(64));
  const [preMuteVolume, setPreMuteVolume] = useState<number>(0.5);

  const handleSelectStation = useCallback((station: Station) => {
    dispatch({ type: 'SELECT_STATION', payload: station });
  }, []);

  const handlePlayPause = useCallback(() => {
    if (playerState.station) {
      dispatch({ type: 'TOGGLE_PAUSE' });
    } else if (displayedStations.length > 0) {
      dispatch({ type: 'PLAY', payload: displayedStations[0] });
    }
  }, [playerState.station, displayedStations]);

  const handleNext = useCallback(() => {
    if (displayedStations.length === 0) return;
    const currentIndex = playerState.station 
      ? displayedStations.findIndex(s => s.stationuuid === playerState.station!.stationuuid) 
      : -1;
    const nextIndex = (currentIndex + 1) % displayedStations.length;
    handleSelectStation(displayedStations[nextIndex]);
  }, [displayedStations, playerState.station, handleSelectStation]);

  const handlePrev = useCallback(() => {
    if (displayedStations.length === 0) return;
    const currentIndex = playerState.station 
      ? displayedStations.findIndex(s => s.stationuuid === playerState.station!.stationuuid) 
      : -1;
    const prevIndex = (currentIndex - 1 + displayedStations.length) % displayedStations.length;
    handleSelectStation(displayedStations[prevIndex]);
  }, [displayedStations, playerState.station, handleSelectStation]);

  const handlePlayerEvent = useCallback((event: any) => {
    dispatch(event);
  }, []);

  const handleNextSong = useCallback((smartPlaylist: SmartPlaylistItem[], seekToTimestamp: (ts: number) => void) => {
    try {
      console.log('Button clicked! Triggering song change (Next)...');
      const now = Math.floor(Date.now() / 1000);
      const currentTrackIndex = [...smartPlaylist].reverse().findIndex(t => t.timestamp <= now + 2);
      const originalIndex = currentTrackIndex >= 0 ? smartPlaylist.length - 1 - currentTrackIndex : -1;
      
      console.log('Current Track Index:', originalIndex, 'Playlist Length:', smartPlaylist.length);

      if (originalIndex !== -1 && originalIndex < smartPlaylist.length - 1) {
        seekToTimestamp(smartPlaylist[originalIndex + 1].timestamp);
      }
    } catch (e) {
      console.error("handleNextSong failed:", e);
    }
  }, []);

  const handlePrevSong = useCallback((smartPlaylist: SmartPlaylistItem[], seekToTimestamp: (ts: number) => void) => {
    try {
      console.log('Button clicked! Triggering song change (Prev)...');
      const now = Math.floor(Date.now() / 1000);
      const currentTrackIndex = [...smartPlaylist].reverse().findIndex(t => t.timestamp <= now + 2);
      const originalIndex = currentTrackIndex >= 0 ? smartPlaylist.length - 1 - currentTrackIndex : -1;
      
      console.log('Current Track Index:', originalIndex);

      if (originalIndex !== -1) {
        const currentTrack = smartPlaylist[originalIndex];
        if (now - currentTrack.timestamp > 5) {
          seekToTimestamp(currentTrack.timestamp);
        } else if (originalIndex > 0) {
          seekToTimestamp(smartPlaylist[originalIndex - 1].timestamp);
        } else {
          seekToTimestamp(currentTrack.timestamp);
        }
      }
    } catch (e) {
      console.error("handlePrevSong failed:", e);
    }
  }, []);

  return {
    playerState,
    dispatch,
    frequencyData,
    setFrequencyData,
    preMuteVolume,
    setPreMuteVolume,
    handleSelectStation,
    handlePlayPause,
    handleNext,
    handlePrev,
    handlePlayerEvent,
    handleNextSong,
    handlePrevSong
  };
};
