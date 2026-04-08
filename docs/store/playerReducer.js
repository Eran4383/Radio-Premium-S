export const initialPlayerState = {
    status: 'IDLE',
    station: null,
};
export function playerReducer(state, action) {
    switch (action.type) {
        case 'SELECT_STATION':
            if (state.station?.stationuuid === action.payload.stationuuid) {
                if (state.status === 'PLAYING')
                    return { ...state, status: 'PAUSED' };
                else if (state.status === 'PAUSED' || state.status === 'ERROR' || state.status === 'IDLE')
                    return { ...state, status: 'LOADING' };
            }
            return { status: 'LOADING', station: action.payload, error: undefined };
        case 'PLAY':
            return { ...state, status: 'LOADING', station: action.payload, error: undefined };
        case 'TOGGLE_PAUSE':
            if (state.status === 'PLAYING')
                return { ...state, status: 'PAUSED' };
            if (state.status === 'PAUSED' && state.station)
                return { ...state, status: 'LOADING', error: undefined };
            return state;
        case 'STREAM_STARTED':
            return { ...state, status: 'PLAYING', error: undefined };
        case 'STREAM_PAUSED':
            if (state.status === 'LOADING')
                return state;
            return { ...state, status: 'PAUSED' };
        case 'STREAM_ERROR':
            return { ...state, status: 'ERROR', error: action.payload };
        case 'AUTOPLAY_BLOCKED':
            return { ...state, status: 'PAUSED', error: undefined };
        default:
            return state;
    }
}
