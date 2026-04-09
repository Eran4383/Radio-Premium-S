import { useMemo, useCallback } from 'react';
import { StationFilter } from '../types';
import { PRIORITY_STATIONS } from '../constants';
import { getCategory } from '../services/categoryService';
export const useStationsLogic = (stations, allSettings, setAllSettings, isFavorite) => {
    const currentSortOrder = useMemo(() => {
        return allSettings.filter === StationFilter.Favorites
            ? allSettings.sortOrderFavorites
            : allSettings.sortOrderAll;
    }, [allSettings.filter, allSettings.sortOrderAll, allSettings.sortOrderFavorites]);
    const displayedStations = useMemo(() => {
        let list = [...(allSettings.filter === StationFilter.Favorites
                ? stations.filter(s => isFavorite(s.stationuuid))
                : stations)];
        const customOrderMap = new Map(allSettings.customOrder.map((uuid, index) => [uuid, index]));
        switch (currentSortOrder) {
            case 'custom':
                list.sort((a, b) => {
                    const indexA = customOrderMap.get(a.stationuuid);
                    const indexB = customOrderMap.get(b.stationuuid);
                    if (typeof indexA === 'number' && typeof indexB === 'number')
                        return indexA - indexB;
                    if (typeof indexA === 'number')
                        return -1;
                    if (typeof indexB === 'number')
                        return 1;
                    return a.name.localeCompare(b.name, 'he');
                });
                break;
            case 'name_asc':
                list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
                break;
            case 'name_desc':
                list.sort((a, b) => b.name.localeCompare(a.name, 'he'));
                break;
            case 'category_style':
            case 'category_identity':
            case 'category_region':
            case 'category_nameStructure':
                const categoryType = currentSortOrder.replace('category_', '');
                list.sort((a, b) => {
                    const catA = getCategory(a, categoryType);
                    const catB = getCategory(b, categoryType);
                    if (catA < catB)
                        return -1;
                    if (catA > catB)
                        return 1;
                    return a.name.localeCompare(b.name, 'he');
                });
                break;
            case 'priority':
            default:
                const getPriorityIndex = (name) => PRIORITY_STATIONS.findIndex(ps => ps.aliases.some(alias => name.toLowerCase().includes(alias.toLowerCase())));
                list.sort((a, b) => {
                    let aP = getPriorityIndex(a.name);
                    let bP = getPriorityIndex(b.name);
                    if (aP === -1)
                        aP = Infinity;
                    if (bP === -1)
                        bP = Infinity;
                    return aP !== bP ? aP - bP : a.name.localeCompare(b.name, 'he');
                });
                break;
        }
        return list;
    }, [stations, allSettings.filter, isFavorite, currentSortOrder, allSettings.customOrder]);
    const setSortOrder = useCallback((order) => {
        if (allSettings.filter === StationFilter.Favorites) {
            setAllSettings(s => ({ ...s, sortOrderFavorites: order }));
        }
        else {
            setAllSettings(s => ({ ...s, sortOrderAll: order }));
        }
    }, [allSettings.filter, setAllSettings]);
    const handleReorder = useCallback((reorderedDisplayedUuids) => {
        const allStationUuids = stations.map(s => s.stationuuid);
        const currentOrderUuids = allSettings.customOrder.length > 0 ? allSettings.customOrder : allStationUuids;
        const reorderedSet = new Set(reorderedDisplayedUuids);
        const newOrder = [...reorderedDisplayedUuids, ...currentOrderUuids.filter(uuid => !reorderedSet.has(uuid))];
        setAllSettings(s => ({
            ...s,
            customOrder: newOrder,
            ...(allSettings.filter === StationFilter.Favorites ? { sortOrderFavorites: 'custom' } : { sortOrderAll: 'custom' })
        }));
    }, [stations, allSettings.customOrder, allSettings.filter, setAllSettings]);
    return {
        displayedStations,
        currentSortOrder,
        setSortOrder,
        handleReorder
    };
};
