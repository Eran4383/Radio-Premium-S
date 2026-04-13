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
}

const Player: React.FC<PlayerProps> = (props) => {
  const { playerState, onPlayPause, onPlay, onPause, onNext, onPrev, onPlayerEvent, eqPreset, customEqSettings, volume, trackInfo, showNextSong, onOpenNowPlaying, setFrequencyData, frequencyData, isVisualizerEnabled, shouldUseProxy, marqueeDelay, isMarqueeProgramEnabled, isMarqueeCurrentTrackEnabled, isMarqueeNextTrackEnabled, marqueeSpeed, onOpenActionMenu } = props;
  const { status, station, error } = playerState;
  const isPlaying = status === 'PLAYING';
  const isLoading = status === 'LOADING';

  const { audioRef, attemptRecovery } = useAudioEngine({
    status, station, volume, eqPreset, customEqSettings, shouldUseProxy: !!shouldUseProxy, onPlayerEvent, setFrequencyData, isPlaying, trackInfo, onPlay, onPause, onNext, onPrev
  });

  if (!station) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="relative bg-bg-secondary/80 backdrop-blur-lg shadow-t-lg">
        {isVisualizerEnabled && isPlaying && <PlayerVisualizer frequencyData={frequencyData} />}
        <div className="max-w-7xl mx-auto p-4 flex items-center justify-between gap-4">
          <PlayerInfo station={station} trackInfo={trackInfo} status={status} error={error} showNextSong={showNextSong} onOpenNowPlaying={onOpenNowPlaying} onOpenActionMenu={onOpenActionMenu} isMarqueeProgramEnabled={isMarqueeProgramEnabled} isMarqueeCurrentTrackEnabled={isMarqueeCurrentTrackEnabled} isMarqueeNextTrackEnabled={isMarqueeNextTrackEnabled} marqueeSpeed={marqueeSpeed} marqueeDelay={marqueeDelay} />
          <PlayerControls isActuallyPlaying={isPlaying} isLoading={isLoading} onPlayPause={onPlayPause} onPrev={onPrev} onNext={onNext} />
        </div>
        <audio ref={audioRef} onPlaying={() => onPlayerEvent({ type: 'STREAM_STARTED' })} onPause={() => onPlayerEvent({ type: 'STREAM_PAUSED' })} onTimeUpdate={() => {}} onStalled={() => attemptRecovery()} onWaiting={() => {}} onError={() => onPlayerEvent({ type: 'STREAM_ERROR', payload: "שגיאה בניגון התחנה."})} />
      </div>
    </div>
  );
};

export default Player;
