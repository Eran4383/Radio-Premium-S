import React from 'react';
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPreviousIcon } from '../Icons';

interface PlayerControlsProps {
  isActuallyPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isActuallyPlaying,
  isLoading,
  onPlayPause,
  onPrev,
  onNext
}) => {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
       <button onClick={onPrev} className="p-2 text-text-secondary hover:text-text-primary" aria-label="הקודם">
          <SkipPreviousIcon className="w-6 h-6" />
      </button>
      <button 
        onClick={onPlayPause} 
        className="p-3 bg-accent text-white rounded-full shadow-md"
        aria-label={isActuallyPlaying ? "השהה" : "נגן"}
      >
        {isActuallyPlaying || isLoading ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}
      </button>
      <button onClick={onNext} className="p-2 text-text-secondary hover:text-text-primary" aria-label="הבא">
          <SkipNextIcon className="w-6 h-6" />
      </button>
    </div>
  );
};

export default PlayerControls;
