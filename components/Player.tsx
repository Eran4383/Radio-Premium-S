import React, { useCallback } from 'react';
import { Station, EqPreset, CustomEqSettings, StationTrackInfo, SmartPlaylistItem } from '../types';
import PlayerVisualizer from './player/PlayerVisualizer';
import PlayerInfo from './player/PlayerInfo';
import PlayerControls from './player/PlayerControls';
import { useAudioEngine } from '../hooks/useAudioEngine';

interface PlayerProps {
  playerState: { status: string; station: Station | null; error?: string };
  onPlayPause: () => void;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onPlayerEvent: (event: any) => void;
  eqPreset: EqPreset;
  customEqSettings: CustomEqSettings;
  volume: number;
  onVolumeChange: (volume: number) => void;
  trackInfo: StationTrackInfo | null;
  showNextSong: boolean;
  onOpenNowPlaying: () => void;
  setFrequencyData: (data: Uint8Array) => void;
  frequencyData: Uint8Array;
  isVisualizerEnabled: boolean;
  shouldUseProxy: boolean;
  marqueeDelay: number;
  isMarqueeProgramEnabled: boolean;
  isMarqueeCurrentTrackEnabled: boolean;
  isMarqueeNextTrackEnabled: boolean;
  marqueeSpeed: number;
  onOpenActionMenu: (songTitle: string) => void;
  is100fmSmartPlayerEnabled: boolean;
  smartPlaylist: SmartPlaylistItem[];
}

const Player: React.FC<PlayerProps> = (props) => {
  const { playerState, onPlayPause, onPlay, onPause, onNext, onPrev, onPlayerEvent, eqPreset, customEqSettings, volume, trackInfo, showNextSong, onOpenNowPlaying, setFrequencyData, frequencyData, isVisualizerEnabled, shouldUseProxy, marqueeDelay, isMarqueeProgramEnabled, isMarqueeCurrentTrackEnabled, isMarqueeNextTrackEnabled, marqueeSpeed, onOpenActionMenu, is100fmSmartPlayerEnabled, smartPlaylist } = props;
  const { status, station, error } = playerState;
  const isPlaying = status === 'PLAYING';
  const isLoading = status === 'LOADING';
  const isSmartPlayerActive = is100fmSmartPlayerEnabled && (station?.stationuuid.startsWith('100fm-') || station?.url_resolved.includes('streamgates.net'));

  const { audioRef, attemptRecovery, switchToDvr, isDvrMode } = useAudioEngine({
    status, station, volume, eqPreset, customEqSettings, shouldUseProxy: !!shouldUseProxy, isSmartPlayerActive: !!isSmartPlayerActive, onPlayerEvent, setFrequencyData, isPlaying, trackInfo, onPlay, onPause, onNext, onPrev, smartPlaylist
  });

  const getCurrentUnixTime = () => Math.floor(Date.now() / 1000);
  const calculateSeekTime = (targetUnixTimestamp: number) => {
    if (!isDvrMode) {
      switchToDvr(targetUnixTimestamp);
      return;
    }
    const audio = audioRef.current;
    if (!audio || !audio.seekable.length) return;
    const now = getCurrentUnixTime();
    const secondsAgo = now - targetUnixTimestamp;
    const livePosition = audio.seekable.end(0);
    const targetPosition = Math.max(0, livePosition - secondsAgo);
    if (isFinite(targetPosition)) audio.currentTime = targetPosition;
  };

  const handleSmartPrev = () => {
    if (!isSmartPlayerActive || smartPlaylist.length === 0) { onPrev(); return; }
    const now = getCurrentUnixTime();
    const currentTrackIndex = [...smartPlaylist].reverse().findIndex(t => t.timestamp <= now + 5);
    const originalIndex = currentTrackIndex >= 0 ? smartPlaylist.length - 1 - currentTrackIndex : -1;
    if (originalIndex !== -1) {
      const currentTrack = smartPlaylist[originalIndex];
      if (now - currentTrack.timestamp > 10) calculateSeekTime(currentTrack.timestamp);
      else if (originalIndex > 0) calculateSeekTime(smartPlaylist[originalIndex - 1].timestamp);
      else calculateSeekTime(currentTrack.timestamp);
    } else onPrev();
  };

  const handleSmartNext = () => {
    if (!isSmartPlayerActive || smartPlaylist.length === 0) { onNext(); return; }
    const now = getCurrentUnixTime();
    const currentTrackIndex = [...smartPlaylist].reverse().findIndex(t => t.timestamp <= now + 5);
    const originalIndex = currentTrackIndex >= 0 ? smartPlaylist.length - 1 - currentTrackIndex : -1;
    if (originalIndex !== -1 && originalIndex < smartPlaylist.length - 1) calculateSeekTime(smartPlaylist[originalIndex + 1].timestamp);
    else {
      const audio = audioRef.current;
      if (audio && audio.seekable.length) audio.currentTime = audio.seekable.end(0);
      else onNext();
    }
  };

  if (!station) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="relative bg-bg-secondary/80 backdrop-blur-lg shadow-t-lg">
        {isVisualizerEnabled && isPlaying && <PlayerVisualizer frequencyData={frequencyData} />}
        <div className="max-w-7xl mx-auto p-4 flex items-center justify-between gap-4">
          <PlayerInfo station={station} trackInfo={trackInfo} status={status} error={error} showNextSong={showNextSong} onOpenNowPlaying={onOpenNowPlaying} onOpenActionMenu={onOpenActionMenu} isMarqueeProgramEnabled={isMarqueeProgramEnabled} isMarqueeCurrentTrackEnabled={isMarqueeCurrentTrackEnabled} isMarqueeNextTrackEnabled={isMarqueeNextTrackEnabled} marqueeSpeed={marqueeSpeed} marqueeDelay={marqueeDelay} isSmartPlayerActive={!!isSmartPlayerActive} />
          <PlayerControls isActuallyPlaying={isPlaying} isLoading={isLoading} onPlayPause={onPlayPause} onSmartPrev={handleSmartPrev} onSmartNext={handleSmartNext} />
        </div>
        <audio ref={audioRef} onPlaying={() => onPlayerEvent({ type: 'STREAM_STARTED' })} onPause={() => onPlayerEvent({ type: 'STREAM_PAUSED' })} onTimeUpdate={() => {}} onStalled={() => attemptRecovery()} onWaiting={() => {}} onError={() => onPlayerEvent({ type: 'STREAM_ERROR', payload: "שגיאה בניגון התחנה."})} />
      </div>
    </div>
  );
};

export default Player;
