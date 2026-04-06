import { useState, useCallback } from 'react';
import { Station } from '../types/station';
import { AllSettings } from '../types/settings';

export const useFavorites = (
  stations: Station[],
  allSettings: AllSettings,
  setAllSettings: React.Dispatch<React.SetStateAction<AllSettings>>
) => {
  const [pendingRemoval, setPendingRemoval] = useState<{ uuid: string; name: string } | null>(null);

  const isFavorite = useCallback(
    (uuid: string) => allSettings.favorites.includes(uuid),
    [allSettings.favorites]
  );

  const toggleFavorite = useCallback(
    (uuid: string) => {
      const isCurrentlyFavorite = allSettings.favorites.includes(uuid);
      if (isCurrentlyFavorite) {
        const station = stations.find((s) => s.stationuuid === uuid);
        const name = station ? station.name : 'תחנה זו';
        setPendingRemoval({ uuid, name });
      } else {
        setAllSettings((s) => ({ ...s, favorites: [...s.favorites, uuid] }));
      }
    },
    [allSettings.favorites, stations, setAllSettings]
  );

  const confirmRemoval = useCallback(() => {
    if (pendingRemoval) {
      setAllSettings((s) => ({
        ...s,
        favorites: s.favorites.filter((id) => id !== pendingRemoval.uuid),
      }));
      setPendingRemoval(null);
    }
  }, [pendingRemoval, setAllSettings]);

  const cancelRemoval = useCallback(() => {
    setPendingRemoval(null);
  }, []);

  return {
    isFavorite,
    toggleFavorite,
    pendingRemoval,
    confirmRemoval,
    cancelRemoval,
  };
};
