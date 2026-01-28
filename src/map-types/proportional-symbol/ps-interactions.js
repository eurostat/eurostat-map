import { getRegionsSelector } from '../../core/utils'
import { getSizeStatData } from './map-proportional-symbols'
import { select } from 'd3-selection'

export function addMouseEvents(map, out) {
    addMouseEventsToSymbols(map, out)
    addMouseEventsToRegions(map, out)
}

const addMouseEventsToRegions = function (map, out) {
    const regions = map.svg().selectAll(getRegionsSelector(map))
    const sizeData = getSizeStatData(map)
    regions
        .on('mouseover', function (e, rg) {
            // only show tooltip for polygons of regions with values of 0
            const sv = sizeData.get(rg.properties.id)
            if (sv?.value === 0 || sv?.value === ':' || sv?.value === '0') {
                select(this).style('fill', map.hoverColor_) // Apply highlight color
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
            } else {
                return // skip regions with no input or value > 0
            }
        })
        .on('mousemove', function (e, rg) {
            const sv = sizeData.get(rg.properties.id)
            if (sv?.value === 0 || sv?.value === ':' || sv?.value === '0') {
                if (out._tooltip) out._tooltip.mousemove(e)
                if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
            } else {
                return // skip regions with no data or value > 0
            }
        })
        .on('mouseout', function (e, rg) {
            const sv = sizeData.get(rg.properties.id)
            if (sv?.value === 0 || sv?.value === ':' || sv?.value === '0') {
                const sel = select(this)
                sel.style('fill', sel.attr('fill___')) // Revert to original color
                if (out._tooltip) out._tooltip.mouseout()
                if (out.onRegionMouseOut_) out.onRegionMouseOut_(e, rg, this, map)
            } else {
                return // skip regions with no data or value > 0
            }
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
