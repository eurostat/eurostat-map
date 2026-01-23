import { select } from 'd3-selection'
import { getRegionsSelector } from '../../../core/utils'

export function addMouseEvents(map, out) {
    addMouseEventsToSymbols(map, out)
    addMouseEventsToRegions(map, out)
}

function addMouseEventsToSymbols(map, out) {
    const symbols = map.svg().selectAll('g.em-centroid')

    symbols
        .on('mouseover', function (e, rg) {
            const sel = select(this)

            // store original fills
            sel.selectAll('path').each(function () {
                const p = select(this)
                p.attr('fill___', p.style('fill'))
                p.style('fill', out.hoverColor_)
            })

            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
        })
        .on('mousemove', function (e, rg) {
            if (out._tooltip) out._tooltip.mousemove(e)
            if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
        })
        .on('mouseout', function (e, rg) {
            const sel = select(this)

            // restore original fills
            sel.selectAll('path').each(function () {
                const p = select(this)
                const original = p.attr('fill___')
                if (original) p.style('fill', original)
            })

            if (out._tooltip) out._tooltip.mouseout()
            if (out.onRegionMouseOut_) out.onRegionMouseOut_(e, rg, this, map)
        })
}

function addMouseEventsToRegions(map, out) {
    const regions = map.svg().selectAll(getRegionsSelector(map))

    regions
        .on('mouseover', function (e, rg) {
            select(this).style('fill', map.hoverColor_)
            if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            if (out.onRegionMouseOver_) out.onRegionMouseOver_(e, rg, this, map)
        })
        .on('mousemove', function (e, rg) {
            if (out._tooltip) out._tooltip.mousemove(e)
            if (out.onRegionMouseMove_) out.onRegionMouseMove_(e, rg, this, map)
        })
        .on('mouseout', function (e, rg) {
            const sel = select(this)
            sel.style('fill', sel.attr('fill___'))
            if (out._tooltip) out._tooltip.mouseout()
            if (out.onRegionMouseOut_) out.onRegionMouseOut_(e, rg, this, map)
        })
}
