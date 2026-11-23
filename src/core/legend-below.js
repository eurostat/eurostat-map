import { isCompact } from './layout-profile'

export const EDGE = 8 // px between the legend and the edge of the map
const GAP = 8 // px between the map and the first legend, and between legends

/**
 * Whether the legends of a map sit below it, not on it: in the compact layout a legend on the map hides much of
 * a small map. Not when the author asked to `keep` the configured placement (`legendCompactPosition('keep')`),
 * or when the legends are behind a toggle button (they float over the map when opened).
 * @param {*} map owning map
 * @returns {boolean}
 */
export const legendsBelowMap = function (map) {
    return !!map && isCompact(map) && map.legendCompactPosition_ !== 'keep' && !map.legendButton_
}

/**
 * Stack the legends of a map under it, left aligned, and return the height they need (0 when none is placed).
 * Positions are in svg coordinates, as every legend's are.
 * @param {*} map owning map
 * @param {number} mapBottom svg y of the bottom edge of the map
 * @returns {number}
 */
export const placeLegendsBelow = function (map, mapBottom) {
    if (!legendsBelowMap(map)) return 0
    const legends = new Set()
    ;(map.layers_ || []).forEach((layer) => {
        const legend = layer.legendObj_
        // a legend drawn into a container the caller manages is theirs to position
        if (legend?.lgg && !legend.lgg.empty() && !legend._hasExternalSvgId) legends.add(legend)
    })
    let y = mapBottom + GAP
    let placed = 0
    legends.forEach((legend) => {
        const node = legend.lgg.node()
        if (node.style.display === 'none') return
        let box
        try {
            box = node.getBBox()
        } catch (e) {
            return
        }
        if (!box.width && !box.height) return
        legend.lgg.attr('transform', `translate(${EDGE - box.x},${y - box.y})`)
        y += box.height + GAP
        placed++
    })
    map._legendsBelowMap_ = placed > 0
    return placed ? y - mapBottom : 0
}
