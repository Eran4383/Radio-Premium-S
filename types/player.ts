import { Station } from './station';

export type PlayerStatus = 'IDLE' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'ERROR';

export interface PlayerState {
  status: PlayerStatus;
  station: Station | null;
  error?: string;
  isDvrMode: boolean;
  lastPauseTimestamp?: number;
  lastPausePosition?: number;
}

export type PlayerAction =
  | { type: 'PLAY'; payload: Station }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'STREAM_STARTED' }
  | { type: 'STREAM_PAUSED' }
  | { type: 'STREAM_ERROR'; payload: string }
  | { type: 'SELECT_STATION'; payload: Station }
  | { type: 'SET_DVR_MODE'; payload: boolean }
  | { type: 'SET_PAUSE_DATA'; payload: { timestamp: number; position: number } }
  | { type: 'AUTOPLAY_BLOCKED' };
