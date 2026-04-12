import React from 'react';
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
  onNextSong: (playlist: SmartPlaylistItem[], seekFn: (ts: number) => void) => void;
  onPrevSong: (playlist: SmartPlaylistItem[], seekFn: (ts: number) => void) => void;
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
  bluetoothAction: 'station' | 'track';
  smartPlaylist: SmartPlaylistItem[];
}

const Player: React.FC<PlayerProps> = (props) => {
  const { playerState, onPlayPause, onPlay, onPause, onNext, onPrev, onNextSong, onPrevSong, onPlayerEvent, eqPreset, customEqSettings, volume, trackInfo, showNextSong, onOpenNowPlaying, setFrequencyData, frequencyData, isVisualizerEnabled, shouldUseProxy, marqueeDelay, isMarqueeProgramEnabled, isMarqueeCurrentTrackEnabled, isMarqueeNextTrackEnabled, marqueeSpeed, onOpenActionMenu, is100fmSmartPlayerEnabled, bluetoothAction, smartPlaylist } = props;
  const { status, station, error } = playerState;
  const isPlaying = status === 'PLAYING';
  const isLoading = status === 'LOADING';
  const is100FM = station?.stationuuid.startsWith('100fm-') || station?.url_resolved.includes('streamgates.net');
  const isSmartPlayerActive = is100fmSmartPlayerEnabled && is100FM;

  const { audioRef, attemptRecovery, seekToTimestamp } = useAudioEngine({
    status, station, volume, eqPreset, customEqSettings, shouldUseProxy: !!shouldUseProxy, isSmartPlayerActive: !!isSmartPlayerActive, onPlayerEvent, setFrequencyData, isPlaying, trackInfo, onPlay, onPause, onNext, onPrev, smartPlaylist, bluetoothAction, onSmartNext: () => onNextSong(smartPlaylist, seekToTimestamp), onSmartPrev: () => onPrevSong(smartPlaylist, seekToTimestamp)
  });

  if (!station) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      {is100fmSmartPlayerEnabled && is100FM && (
        <div className="w-full flex items-center justify-center py-2 bg-bg-secondary/40 backdrop-blur-md animate-fade-in">
          <button 
            onClick={() => onPrevSong(smartPlaylist, seekToTimestamp)}
            disabled={smartPlaylist.length === 0}
            className={`bg-gradient-to-b from-gray-700 to-gray-900 text-white rounded-lg transition-all shadow-[0_4px_0_rgb(31,41,55)] active:shadow-none active:translate-y-[2px] px-8 py-1 mx-2 text-xs font-bold ${smartPlaylist.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          >
            שיר קודם
          </button>
          {smartPlaylist.length === 0 && (
            <span className="text-[10px] text-text-secondary animate-pulse">טוען רשימת שירים...</span>
          )}
          <button 
            onClick={() => onNextSong(smartPlaylist, seekToTimestamp)}
            disabled={smartPlaylist.length === 0}
            className={`bg-gradient-to-b from-gray-700 to-gray-900 text-white rounded-lg transition-all shadow-[0_4px_0_rgb(31,41,55)] active:shadow-none active:translate-y-[2px] px-8 py-1 mx-2 text-xs font-bold ${smartPlaylist.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          >
            שיר הבא
          </button>
        </div>
      )}
      <div className="relative bg-bg-secondary/80 backdrop-blur-lg shadow-t-lg">
        {isVisualizerEnabled && isPlaying && <PlayerVisualizer frequencyData={frequencyData} />}
        <div className="max-w-7xl mx-auto p-4 flex items-center justify-between gap-4">
          <PlayerInfo station={station} trackInfo={trackInfo} status={status} error={error} showNextSong={showNextSong} onOpenNowPlaying={onOpenNowPlaying} onOpenActionMenu={onOpenActionMenu} isMarqueeProgramEnabled={isMarqueeProgramEnabled} isMarqueeCurrentTrackEnabled={isMarqueeCurrentTrackEnabled} isMarqueeNextTrackEnabled={isMarqueeNextTrackEnabled} marqueeSpeed={marqueeSpeed} marqueeDelay={marqueeDelay} isSmartPlayerActive={!!isSmartPlayerActive} />
          <PlayerControls isActuallyPlaying={isPlaying} isLoading={isLoading} onPlayPause={onPlayPause} onPrev={onPrev} onNext={onNext} />
        </div>
        <audio ref={audioRef} onPlaying={() => onPlayerEvent({ type: 'STREAM_STARTED' })} onPause={() => onPlayerEvent({ type: 'STREAM_PAUSED' })} onTimeUpdate={() => {}} onStalled={() => attemptRecovery()} onWaiting={() => {}} onError={() => onPlayerEvent({ type: 'STREAM_ERROR', payload: "שגיאה בניגון התחנה."})} />
      </div>
    </div>
  );
};

export default Player;
