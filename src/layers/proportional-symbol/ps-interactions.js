import { getRegionsSelector } from '../../core/utils'
import { getSizeStatData } from './map-proportional-symbols'
import { select } from 'd3-selection'

export function addMouseEvents(map, layer) {
    // Clear any existing event handlers first to prevent duplicates during rebuilds
    clearMouseEvents(map, layer)

    addMouseEventsToSymbols(map, layer)
    if (shouldHandleRegionHover(map, layer)) {
        addMouseEventsToRegions(map, layer)
    }
}

function shouldHandleRegionHover(map, layer) {
    // In multi-layer maps, keep polygon hover/tooltip owned by the base layer.
    return !(map.layers_ && map.layers_.some((l) => l.role === 'base' && l !== layer))
}

function clearMouseEvents(map, layer) {
    // Remove existing handlers from symbols
    map.svg().selectAll('g.em-centroid').on('mouseover', null).on('mousemove', null).on('mouseout', null)

    // Only clear region handlers when proportional-symbol owns region hover.
    if (shouldHandleRegionHover(map, layer)) {
        map.svg().selectAll(getRegionsSelector(map)).on('mouseover', null).on('mousemove', null).on('mouseout', null)
    }
}

const addMouseEventsToRegions = function (map, layer) {
    const regions = map.svg().selectAll(getRegionsSelector(map))
    const sizeData = getSizeStatData(layer)
    regions
        .on('mouseover', function (e, rg) {
            const sv = sizeData.get(rg.properties.id)

            // Skip regions with no input data at all
            if (!sv || sv.value === undefined || sv.value === null) {
                return
            }

            select(this).style('fill', map.hoverColor_)
            if (map._tooltip) map._tooltip.mouseover(layer.tooltip_.textFunction(rg, layer))
            if (map.onRegionMouseOver_) map.onRegionMouseOver_(e, rg, this, map)
        })
        .on('mousemove', function (e, rg) {
            const sv = sizeData.get(rg.properties.id)

            // Skip regions with no input data at all
            if (!sv || sv.value === undefined || sv.value === null) {
                return
            }

            if (map._tooltip) map._tooltip.mousemove(e)
            if (map.onRegionMouseMove_) map.onRegionMouseMove_(e, rg, this, map)
        })
        .on('mouseout', function (e, rg) {
            const sv = sizeData.get(rg.properties.id)

            // Skip regions with no input data at all
            if (!sv || sv.value === undefined || sv.value === null) {
                return
            }

            const sel = select(this)
            sel.style('fill', sel.attr('fill___'))
            if (map._tooltip) map._tooltip.mouseout()
            if (map.onRegionMouseOut_) map.onRegionMouseOut_(e, rg, this, map)
        })
}

const addMouseEventsToSymbols = function (map, layer) {
    const symbols = map.svg().selectAll('g.em-centroid')
    //symbols
    symbols
        .on('mouseover', function (e, rg) {
            const sel = select(this.childNodes[0])
            sel.attr('fill___', sel.style('fill'))
            sel.style('fill', map.hoverColor_)
            if (map._tooltip) map._tooltip.mouseover(layer.tooltip_.textFunction(rg, layer))
            if (map.onRegionMouseOver_) map.onRegionMouseOver_(e, rg, this, map)
        })
        .on('mousemove', function (e, rg) {
            if (map._tooltip) map._tooltip.mousemove(e)
            if (map.onRegionMouseMove_) map.onRegionMouseMove_(e, rg, this, map)
        })
        .on('mouseout', function (e, rg) {
            const sel = select(this.childNodes[0])
            let newFill = sel.attr('fill___')
            if (newFill) {
                sel.style('fill', newFill)
                if (map._tooltip) map._tooltip.mouseout()
            }
            if (map.onRegionMouseOut_) map.onRegionMouseOut_(e, rg, this, map)
        })
}
