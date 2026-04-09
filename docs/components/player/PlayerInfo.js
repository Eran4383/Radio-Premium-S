import React, { useRef, useEffect, useState } from 'react';
import InteractiveText from '../InteractiveText';
import MarqueeText from '../MarqueeText';
const PlayerInfo = ({ station, trackInfo, status, error, showNextSong, onOpenNowPlaying, onOpenActionMenu, isMarqueeProgramEnabled, isMarqueeCurrentTrackEnabled, isMarqueeNextTrackEnabled, marqueeSpeed, marqueeDelay, isSmartPlayerActive }) => {
    const [startAnimation, setStartAnimation] = useState(false);
    const stationNameRef = useRef(null);
    const currentTrackRef = useRef(null);
    const nextTrackRef = useRef(null);
    const [marqueeConfig, setMarqueeConfig] = useState({ duration: 0, isOverflowing: [false, false, false] });
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
                if (!content)
                    return false;
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
    return (React.createElement("div", { className: "flex items-center gap-3 flex-1 min-w-0" },
        React.createElement("img", { src: station.favicon, alt: station.name, className: "w-14 h-14 rounded-md bg-gray-700 object-contain flex-shrink-0 cursor-pointer", onClick: onOpenNowPlaying, onError: (e) => { e.target.src = 'https://picsum.photos/48'; } }),
        React.createElement("div", { className: "min-w-0 cursor-pointer", key: station.stationuuid, onClick: onOpenNowPlaying },
            React.createElement(MarqueeText, { loopDelay: marqueeDelay, duration: marqueeConfig.duration, startAnimation: startAnimation, isOverflowing: marqueeConfig.isOverflowing[0] && isMarqueeProgramEnabled, contentRef: stationNameRef, className: "font-bold text-text-primary" },
                React.createElement("span", null, `${station.name}${trackInfo?.program ? ` | ${trackInfo.program}` : ''}`)),
            React.createElement("div", { className: "text-sm text-text-secondary leading-tight h-[1.25rem] flex items-center" }, status === 'ERROR' ? (React.createElement("span", { className: "text-red-400" }, error)) : trackInfo?.current ? (React.createElement(MarqueeText, { loopDelay: marqueeDelay, duration: marqueeConfig.duration, startAnimation: startAnimation, isOverflowing: marqueeConfig.isOverflowing[1] && isMarqueeCurrentTrackEnabled, contentRef: currentTrackRef },
                React.createElement(InteractiveText, { text: trackInfo.current, onOpenActionMenu: onOpenActionMenu }))) : status === 'LOADING' ? (React.createElement("span", { className: "text-text-secondary animate-pulse" }, "\u05D8\u05D5\u05E2\u05DF...")) : isSmartPlayerActive ? (React.createElement("span", { className: "text-accent text-xs font-semibold animate-pulse" }, "\u05E0\u05D2\u05DF \u05D7\u05DB\u05DD 100FM \u05E4\u05E2\u05D9\u05DC")) : null),
            status !== 'ERROR' && showNextSong && trackInfo?.next && (React.createElement("div", { className: "text-xs opacity-80 h-[1.125rem] flex items-center" },
                React.createElement("span", { className: "font-semibold flex-shrink-0" }, "\u05D4\u05D1\u05D0:\u00A0"),
                React.createElement(MarqueeText, { loopDelay: marqueeDelay, duration: marqueeConfig.duration, startAnimation: startAnimation, isOverflowing: marqueeConfig.isOverflowing[2] && isMarqueeNextTrackEnabled, contentRef: nextTrackRef },
                    React.createElement("span", null, trackInfo.next)))))));
};
export default PlayerInfo;
