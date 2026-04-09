import React, { useRef, useEffect, useState } from 'react';
import { Station, StationTrackInfo } from '../../types/station';
import InteractiveText from '../InteractiveText';
import MarqueeText from '../MarqueeText';

interface PlayerInfoProps {
  station: Station;
  trackInfo: StationTrackInfo | null;
  trackError: string | null;
  setIsErrorModalOpen: (open: boolean) => void;
  status: string;
  error?: string;
  showNextSong: boolean;
  onOpenNowPlaying: () => void;
  onOpenActionMenu: (songTitle: string) => void;
  isMarqueeProgramEnabled: boolean;
  isMarqueeCurrentTrackEnabled: boolean;
  isMarqueeNextTrackEnabled: boolean;
  marqueeSpeed: number;
  marqueeDelay: number;
  isSmartPlayerActive: boolean;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  station,
  trackInfo,
  trackError,
  setIsErrorModalOpen,
  status,
  error,
  showNextSong,
  onOpenNowPlaying,
  onOpenActionMenu,
  isMarqueeProgramEnabled,
  isMarqueeCurrentTrackEnabled,
  isMarqueeNextTrackEnabled,
  marqueeSpeed,
  marqueeDelay,
  isSmartPlayerActive
}) => {
  const [startAnimation, setStartAnimation] = useState(false);
  const stationNameRef = useRef<HTMLSpanElement>(null);
  const currentTrackRef = useRef<HTMLSpanElement>(null);
  const nextTrackRef = useRef<HTMLSpanElement>(null);
  const [marqueeConfig, setMarqueeConfig] = useState<{ duration: number; isOverflowing: boolean[] }>({ duration: 0, isOverflowing: [false, false, false] });

  useEffect(() => {
    setStartAnimation(false);
    const timer = setTimeout(() => setStartAnimation(true), 3000);
    return () => clearTimeout(timer);
  }, [station.stationuuid]);

  useEffect(() => {
    const calculateMarquee = () => {
      const refs = [stationNameRef, currentTrackRef, nextTrackRef];
      let maxContentWidth = 0;
      const newIsOverflowing = refs.map(ref => {
        const content = ref.current;
        if (!content) return false;
        const container = content.closest('.marquee-wrapper, .truncate');
        if (container && content.scrollWidth > container.clientWidth) {
          maxContentWidth = Math.max(maxContentWidth, content.scrollWidth);
          return true;
        }
        return false;
      });
      const anyOverflowing = newIsOverflowing.some(Boolean);
      const pixelsPerSecond = 3.668 * Math.pow(1.363, marqueeSpeed);
      const newDuration = anyOverflowing ? Math.max(5, maxContentWidth / pixelsPerSecond) : 0;
      setMarqueeConfig({ duration: newDuration, isOverflowing: newIsOverflowing });
    };
    const timeoutId = setTimeout(calculateMarquee, 50);
    return () => clearTimeout(timeoutId);
  }, [station, trackInfo, showNextSong, marqueeSpeed]);

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <img 
        src={station.favicon} 
        alt={station.name} 
        className="w-14 h-14 rounded-md bg-gray-700 object-contain flex-shrink-0 cursor-pointer"
        onClick={onOpenNowPlaying}
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/48'; }}
      />
      <div className="min-w-0 cursor-pointer" key={station.stationuuid} onClick={onOpenNowPlaying}>
         <MarqueeText
            loopDelay={marqueeDelay}
            duration={marqueeConfig.duration}
            startAnimation={startAnimation}
            isOverflowing={marqueeConfig.isOverflowing[0] && isMarqueeProgramEnabled}
            contentRef={stationNameRef}
            className="font-bold text-text-primary"
        >
            <span>{`${station.name}${trackInfo?.program ? ` | ${trackInfo.program}` : ''}`}</span>
        </MarqueeText>

        <div className="text-sm text-text-secondary leading-tight h-[1.25rem] flex items-center">
          {status === 'ERROR' ? (
            <span className="text-red-400">{error}</span>
          ) : trackError ? (
            <span className="text-red-400 cursor-pointer underline" onClick={(e) => { e.stopPropagation(); setIsErrorModalOpen(true); }}>{trackError}</span>
          ) : trackInfo?.current ? (
            <MarqueeText
                loopDelay={marqueeDelay}
                duration={marqueeConfig.duration}
                startAnimation={startAnimation}
                isOverflowing={marqueeConfig.isOverflowing[1] && isMarqueeCurrentTrackEnabled}
                contentRef={currentTrackRef}
            >
                <InteractiveText text={trackInfo.current} onOpenActionMenu={onOpenActionMenu} />
            </MarqueeText>
          ) : status === 'LOADING' ? (
              <span className="text-text-secondary animate-pulse">טוען...</span>
          ) : isSmartPlayerActive ? (
              <span className="text-accent text-xs font-semibold animate-pulse">נגן חכם 100FM פעיל</span>
          ) : null}
        </div>
         {status !== 'ERROR' && showNextSong && trackInfo?.next && (
            <div className="text-xs opacity-80 h-[1.125rem] flex items-center">
              <span className="font-semibold flex-shrink-0">הבא:&nbsp;</span>
              <MarqueeText 
                  loopDelay={marqueeDelay} 
                  duration={marqueeConfig.duration}
                  startAnimation={startAnimation}
                  isOverflowing={marqueeConfig.isOverflowing[2] && isMarqueeNextTrackEnabled}
                  contentRef={nextTrackRef}
              >
                <span>{trackInfo.next}</span>
              </MarqueeText>
            </div>
          )}
      </div>
    </div>
  );
};

export default PlayerInfo;
