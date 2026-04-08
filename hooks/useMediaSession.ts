import { useEffect } from 'react';
import { Station, StationTrackInfo } from '../types';

interface MediaSessionProps {
  station: Station | null;
  status: string;
  trackInfo: StationTrackInfo | null;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const useMediaSession = ({
  station,
  status,
  trackInfo,
  onPlay,
  onPause,
  onNext,
  onPrev
}: MediaSessionProps) => {
  useEffect(() => {
    if ('mediaSession' in navigator && station) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${station.name}${trackInfo?.program ? ` | ${trackInfo.program}` : ''}`,
        artist: trackInfo?.current || 'רדיו פרימיום',
        artwork: [{ src: station.favicon, sizes: '96x96', type: 'image/png' }],
      });
      navigator.mediaSession.setActionHandler('play', onPlay);
      navigator.mediaSession.setActionHandler('pause', onPause);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      navigator.mediaSession.playbackState = status === 'PLAYING' ? 'playing' : 'paused';
    }
  }, [station, status, trackInfo, onPlay, onPause, onNext, onPrev]);
};
