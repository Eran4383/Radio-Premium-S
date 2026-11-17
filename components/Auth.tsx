import React from 'react';
import { GoogleIcon } from './Icons';
import { User } from '../types';

interface AuthProps {
  user: User | null;
  customAvatarUrl?: string | null;
  customDisplayName?: string | null;
  onOpenProfileModal: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

const Auth: React.FC<AuthProps> = ({
  user,
  customAvatarUrl,
  customDisplayName,
  onOpenProfileModal,
  onLogin,
  onLogout,
}) => {
  const avatarSrc = customAvatarUrl || user?.photoURL || undefined;
  const displayName = customDisplayName || user?.displayName || 'פרופיל ומכשירים';

  if (user) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onOpenProfileModal}
          className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="פרופיל אישי ומכשירים מחוברים"
          aria-label="פתח הגדרות פרופיל ומכשירים"
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={displayName}
              className="w-10 h-10 rounded-full ring-2 ring-accent object-cover group-hover:opacity-85 transition-opacity"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full ring-2 ring-accent bg-bg-primary flex items-center justify-center text-sm font-bold text-accent">
              {displayName.slice(0, 1)}
            </div>
          )}
        </button>
        <div className="text-center">
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="block text-xs text-text-primary font-semibold truncate max-w-[78px] hover:text-accent transition-colors"
            title="הגדרות פרופיל ומכשירים"
          >
            {displayName}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="text-[11px] text-accent hover:underline"
          >
            התנתק
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onOpenProfileModal}
        className="w-10 h-10 rounded-full bg-bg-primary flex items-center justify-center ring-2 ring-gray-600 hover:ring-accent transition-all overflow-hidden"
        title="פרופיל אישי ומכשירים"
        aria-label="פתח הגדרות פרופיל ומכשירים"
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <GoogleIcon className="w-6 h-6" />
        )}
      </button>
      <button
        type="button"
        onClick={onLogin}
        className="text-xs text-text-secondary hover:text-accent transition-colors"
      >
        התחברות
      </button>
    </div>
  );
};

export default Auth;
