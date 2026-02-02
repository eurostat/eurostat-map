import { getRegionsSelector } from '../../core/utils'
import { getSizeStatData } from './map-proportional-symbols'
import { select } from 'd3-selection'

export function addMouseEvents(map, out) {
    // Clear any existing event handlers first to prevent duplicates during rebuilds
    clearMouseEvents(map)

    addMouseEventsToSymbols(map, out)
    addMouseEventsToRegions(map, out)
}

function clearMouseEvents(map) {
    // Remove existing handlers from symbols
    map.svg().selectAll('g.em-centroid').on('mouseover', null).on('mousemove', null).on('mouseout', null)

    // Remove existing handlers from regions
    map.svg().selectAll(getRegionsSelector(map)).on('mouseover', null).on('mousemove', null).on('mouseout', null)
}

const addMouseEventsToRegions = function (map, out) {
    const regions = map.svg().selectAll(getRegionsSelector(map))
    const sizeData = getSizeStatData(map)
    regions
        .on('mouseover', function (e, rg) {
            const sv = sizeData.get(rg.properties.id)

            // Skip regions with no input data at all
            if (!sv || sv.value === undefined || sv.value === null) {
                return
            }

            select(this).style('fill', map.hoverColor_)
            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
        })
        .on('mousemove', function (e, rg) {
            const sv = sizeData.get(rg.properties.id)

            // Skip regions with no input data at all
            if (!sv || sv.value === undefined || sv.value === null) {
                return
            }

            if (out._tooltip) out._tooltip.mousemove(e)
            if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
        })
        .on('mouseout', function (e, rg) {
            const sv = sizeData.get(rg.properties.id)

            // Skip regions with no input data at all
            if (!sv || sv.value === undefined || sv.value === null) {
                return
            }

            const sel = select(this)
            sel.style('fill', sel.attr('fill___'))
            if (out._tooltip) out._tooltip.mouseout()
            if (out.onRegionMouseOut_) out.onRegionMouseOut_(e, rg, this, map)
        })
}

const addMouseEventsToSymbols = function (map, out) {
    const symbols = map.svg().selectAll('g.em-centroid')
    //symbols
    symbols
        .on('mouseover', function (e, rg) {
            const sel = select(this.childNodes[0])
            sel.attr('fill___', sel.style('fill'))
            sel.style('fill', out.hoverColor_)
            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
        })
        .on('mousemove', function (e, rg) {
            if (out._tooltip) out._tooltip.mousemove(e)
            if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
        })
        .on('mouseout', function (e, rg) {
            const sel = select(this.childNodes[0])
            let newFill = sel.attr('fill___')
            if (newFill) {
                sel.style('fill', newFill)
                if (out._tooltip) out._tooltip.mouseout()
            }
            if (out.onRegionMouseOut_) out.onRegionMouseOut_(e, rg, this, map)
        })
}
