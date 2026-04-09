const checkKeywords = (station, keywords) => {
    const name = station.name.toLowerCase();
    const tags = station.tags.toLowerCase();
    return keywords.some(kw => name.includes(kw.toLowerCase()) || tags.includes(kw.toLowerCase()));
};
const getStyleCategory = (station) => {
    if (checkKeywords(station, ['Mizrahit FM Best', 'mizrahit radio', 'Mizrahit_Fm', 'Rak Musica', 'קול פליי']))
        return "מוזיקה מזרחית";
    if (checkKeywords(station, ['Jewish Music Stream', 'Nachman', 'Radio Breslev Carmiel', 'Abdulbasit Abdulsamad']))
        return "מוזיקה דתית / יהודית";
    if (checkKeywords(station, ['100% Rock', '#joint radio Blues Rock', 'GUITAR - J. WILLIAMS']))
        return "מוזיקת רוק / בלוז";
    if (checkKeywords(station, ['#Joint Radio Reggae']))
        return "מוזיקת רגאיי";
    if (checkKeywords(station, ['100% Jazz', '100% Latin', '100% World Music', 'Special Eurovision']))
        return "לועזי / ז'אנר ספציפי";
    if (checkKeywords(station, ["100% Chillout", "100% Café", "100% Drivetime", "100% 70's", "100% Oldies"]))
        return "אווירה / נושא";
    return 'כללי / מעורב (ישראלי)';
};
const getIdentityCategory = (station) => {
    if (checkKeywords(station, ['כאן 88', 'גלגלצ']))
        return "ציבורי (מדינת ישראל)";
    if (checkKeywords(station, ['101.5fm רדיו דרום', '104.5FM צפון', '91FM', '103fm', 'Radio 90FM']))
        return "רדיו אזורי / מסחרי";
    if (checkKeywords(station, ['Nachman', 'Radio Breslev Carmiel']))
        return "רדיו דתי / קהילתי";
    return 'רדיו אינטרנטי / נישתי';
};
const getRegionCategory = (station) => {
    if (checkKeywords(station, ['104.5FM צפון', 'Radio Breslev Carmiel']))
        return "צפון הארץ";
    if (checkKeywords(station, ['101.5fm רדיו דרום']))
        return "דרום הארץ";
    if (checkKeywords(station, ['Лучшее Радио', 'Abdulbasit Abdulsamad']))
        return "שפה זרה / ממוקדת";
    return 'עברית / ישראלית';
};
const getNameStructureCategory = (station) => {
    const name = station.name.toLowerCase();
    if (/\d{2,3}(\.\d)?fm/.test(name))
        return 'מכיל תדר FM';
    if (name.includes('100%'))
        return 'מכיל אחוז (100%)';
    if (checkKeywords(station, ['#Joint Radio Reggae', 'Doomnation Radio', 'mizrahit radio', 'Radio Qualita']))
        return 'מכיל את המילה "רדיו"';
    if (checkKeywords(station, ['כאן 88', 'גלגלצ']))
        return 'שמות מוסדיים';
    return 'אחר';
};
export const getCategory = (station, type) => {
    switch (type) {
        case 'style': return getStyleCategory(station);
        case 'identity': return getIdentityCategory(station);
        case 'region': return getRegionCategory(station);
        case 'nameStructure': return getNameStructureCategory(station);
        default: return 'אחר';
    }
};
