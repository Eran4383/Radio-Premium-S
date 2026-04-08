import React, { useRef, useCallback } from 'react';
const InteractiveText = ({ text, className, onOpenActionMenu }) => {
    const timerRef = useRef(null);
    const isLongPress = useRef(false);
    const handlePressStart = useCallback(() => {
        isLongPress.current = false;
        timerRef.current = window.setTimeout(() => {
            isLongPress.current = true;
            onOpenActionMenu(text);
        }, 500); // 500ms for long press
    }, [text, onOpenActionMenu]);
    const handlePressEnd = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);
    const handleClick = useCallback((e) => {
        // Prevent default action if it was a long press
        if (isLongPress.current) {
            e.preventDefault();
        }
        // Short click does nothing as per the new requirement.
    }, []);
    const combinedClassName = `font-semibold cursor-pointer transition-colors hover:text-accent ${className || ''}`;
    return (React.createElement("span", { className: combinedClassName, style: { userSelect: 'none', WebkitUserSelect: 'none' }, onMouseDown: handlePressStart, onMouseUp: handlePressEnd, onMouseLeave: handlePressEnd, onTouchStart: handlePressStart, onTouchEnd: handlePressEnd, onClick: handleClick, onContextMenu: (e) => e.preventDefault(), role: "button", tabIndex: 0, "aria-label": `לחיצה ארוכה לפעולות נוספות עבור ${text}` }, text));
};
export default InteractiveText;
