// Region groups only need to be told apart, so the fills are the quietest the map can carry: all light (L* ~91, the EU a
// touch darker), chroma <= 6 (cool grey, warm grey, sage grey) and a pure neutral grey for the EU hub. No saturated hue, so
// nothing competes with the flows' blue/red change ramp, and every flow colour keeps >= 23 L* of contrast against them.
// Neighbouring groups stay >= 5 apart in CIE76 dE; with national borders drawn that is enough to separate them.
// The group index decides the neighbours: the assignment below is a valid four-colouring, so keep it when changing fills.
const regionalPalette = ['#e0e6ec', '#ece5da', '#e0e8de', '#dcdcdc']

const regionalColors = {
    'north america': regionalPalette[0],
    'central america and caribbean': regionalPalette[1],
    'south america': regionalPalette[2],
    'eastern africa': regionalPalette[0],
    'north africa': regionalPalette[2],
    'rest of africa': regionalPalette[1],
    'western asia': regionalPalette[0],
    'southern asia': regionalPalette[1],
    'central asia': regionalPalette[2],
    'eastern asia': regionalPalette[0],
    'south eastern asia': regionalPalette[2],
    'oceania and southern polar regions': regionalPalette[0],
    'europe except eu': regionalPalette[1],
    eu: regionalPalette[3],
}
