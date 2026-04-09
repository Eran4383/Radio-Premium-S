import { useReducer, useState, useCallback } from 'react';
import { playerReducer, initialPlayerState } from '../store/playerReducer';
export const usePlayer = (displayedStations) => {
    const [playerState, dispatch] = useReducer(playerReducer, initialPlayerState);
    const [frequencyData, setFrequencyData] = useState(new Uint8Array(64));
    const [preMuteVolume, setPreMuteVolume] = useState(0.5);
    const handleSelectStation = useCallback((station) => {
        dispatch({ type: 'SELECT_STATION', payload: station });
    }, []);
    const handlePlayPause = useCallback(() => {
        if (playerState.station) {
            dispatch({ type: 'TOGGLE_PAUSE' });
        }
        else if (displayedStations.length > 0) {
            dispatch({ type: 'PLAY', payload: displayedStations[0] });
        }
    }, [playerState.station, displayedStations]);
    const handleNext = useCallback(() => {
        if (displayedStations.length === 0)
            return;
        const currentIndex = playerState.station
            ? displayedStations.findIndex(s => s.stationuuid === playerState.station.stationuuid)
            : -1;
        const nextIndex = (currentIndex + 1) % displayedStations.length;
        handleSelectStation(displayedStations[nextIndex]);
    }, [displayedStations, playerState.station, handleSelectStation]);
    const handlePrev = useCallback(() => {
        if (displayedStations.length === 0)
            return;
        const currentIndex = playerState.station
            ? displayedStations.findIndex(s => s.stationuuid === playerState.station.stationuuid)
            : -1;
        const prevIndex = (currentIndex - 1 + displayedStations.length) % displayedStations.length;
        handleSelectStation(displayedStations[prevIndex]);
    }, [displayedStations, playerState.station, handleSelectStation]);
    const handlePlayerEvent = useCallback((event) => {
        dispatch(event);
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
        handlePlayerEvent
    };
};
