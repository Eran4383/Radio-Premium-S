export const THEMES = ['dark', 'light', 'blue', 'sunset', 'forest', 'ocean', 'rose', 'matrix'] as const;
export type Theme = typeof THEMES[number];
