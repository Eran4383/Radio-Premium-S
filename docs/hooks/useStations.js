import { useState, useEffect, useCallback } from 'react';
import { fetchStations } from '../services/radioService';
export const useStations = () => {
    const [stations, setStations] = useState([]);
    const [stationsStatus, setStationsStatus] = useState('idle');
    const [error, setError] = useState(null);
    useEffect(() => {
        const loadStations = async () => {
            const cachedStationsStr = localStorage.getItem('radio-stations-cache');
            let hasCachedData = false;
            if (cachedStationsStr) {
                try {
                    const cachedStations = JSON.parse(cachedStationsStr);
                    if (Array.isArray(cachedStations) && cachedStations.length > 0) {
                        setStations(cachedStations);
                        setStationsStatus('loaded');
                        hasCachedData = true;
                    }
                }
                catch (e) {
                    console.error("Failed to parse cached stations", e);
                }
            }
            if (!hasCachedData) {
                setStationsStatus('loading');
            }
            try {
                const fetchedStations = await fetchStations();
                if (fetchedStations.length > 0) {
                    setStations(fetchedStations);
                    setStationsStatus('loaded');
                    localStorage.setItem('radio-stations-cache', JSON.stringify(fetchedStations));
                }
                else if (!hasCachedData) {
                    setError('לא הצלחנו למצוא תחנות. נסה לרענן את העמוד.');
                    setStationsStatus('error');
                }
            }
            catch (err) {
                console.error("Error fetching stations:", err);
                if (!hasCachedData) {
                    setError('אירעה שגיאה בטעינת התחנות.');
                    setStationsStatus('error');
                }
            }
        };
        loadStations();
    }, []);
    const handleAdminUpdate = useCallback((newStations) => {
        setStations(newStations);
        localStorage.setItem('radio-stations-cache', JSON.stringify(newStations));
    }, []);
    return {
        stations,
        setStations,
        stationsStatus,
        error,
        handleAdminUpdate
    };
};
