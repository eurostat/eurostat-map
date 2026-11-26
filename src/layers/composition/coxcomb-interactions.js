// Hover behaviour of a coxcomb map.
import { select } from 'd3-selection'
import { getRegionsSelector } from '../../core/utils'
import { getRegionTotal } from './coxcomb-data'

// ── Mouse events ─────────────────────────────────────────────────────────

/**
 * Add tooltip mouse events to region polygons (like pie charts do).
 * This allows users to hover over the region fill, not just the coxcomb chart.
 */
export function addMouseEventsToRegionPolygons(out, map) {
    const selector = getRegionsSelector(map)
    const regions = map.svg().selectAll(selector)

    regions
        .on('mouseenter', function (e, rg) {
            if (!getRegionTotal(out, rg.properties.id)) return
            const sel = select(this)
            sel.attr('fill___', sel.style('fill'))
            sel.style('fill', out.hoverColor_)
            if (out.map._tooltip) out.map._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
        })
        // .on('mousemove', function (e) {
        //     if (out.map._tooltip) out.map._tooltip.mousemove(e)
        // })
        .on('mouseleave', function (e, rg) {
            const sel = select(this)
            const newFill = sel.attr('fill___')
            if (newFill) {
                sel.style('fill', newFill)
                sel.attr('fill___', null)
                if (out.map._tooltip) out.map._tooltip.mouseout()
            }
        })
}

/**
 * Coxcomb mouse events are attached to the centroid symbol groups (not region
 * paths) and include ring/chart stroke highlighting — distinct from the shared
 * addMouseEventsToRegions which operates on plain region fills.
 */
export function addMouseEventsToRegions(out, map) {
    const shouldOmit = (id) => map.tooltip_.omitRegions?.includes(id)
    const symbols = map.svg().selectAll('g.em-centroid')

    // Cache to avoid repeated function calls on mousemove
    let cachedRegion = null
    let cachedSelection = null

    symbols
        .on('mouseenter', function (e, rg) {
            if (shouldOmit(rg.properties.id) || !getRegionTotal(out, rg.properties.id)) return

            // Cache for mousemove performance
            cachedRegion = rg
            cachedSelection = select(this)

            cachedSelection.attr('fill___', cachedSelection.style('fill'))
            cachedSelection.style('fill', out.hoverColor_)
            highlightCoxcombChart(out, cachedSelection, true)
            if (out.map._tooltip) out.map._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
        })
        // .on('mousemove', function (e, rg) {
        //     // Use cached data to avoid expensive checks on every mousemove
        //     if (!cachedRegion) return
        //     if (out.map._tooltip) out.map._tooltip.mousemove(e)
        // })
        .on('mouseleave', function (e, rg) {
            // Use cached data for consistent behavior
            if (!cachedRegion || !cachedSelection) return

            cachedSelection.style('fill', cachedSelection.attr('fill___') || '')
            cachedSelection.attr('fill___', null)
            highlightCoxcombChart(out, cachedSelection, false)
            if (out.map._tooltip) out.map._tooltip.mouseout()

            // Clear cache
            cachedRegion = null
            cachedSelection = null
        })
}

export function addMouseEventsToGridCartogram(out, map) {
    const shapes = out.svg().selectAll('#em-grid-container .em-grid-cell .em-grid-shape')
    const charts = out.svg().selectAll('#em-grid-container .em-grid-cell .em-coxcomb')

    const getRegionData = (el) => select(el.closest('.em-grid-cell')).datum()

    // Cache to avoid repeated DOM lookups on mousemove
    let cachedRegion = null
    let cachedCell = null

    const handleMouseOver = function (e) {
        const rg = getRegionData(this)
        if (!rg || !getRegionTotal(out, rg.properties.id)) return

        // Cache for mousemove performance
        cachedRegion = rg
        cachedCell = select(this.closest('.em-grid-cell'))

        const shape = cachedCell.select('.em-grid-shape')
        shape.attr('fill___', shape.style('fill')).style('fill', out.hoverColor_)
        highlightCoxcombChart(out, cachedCell, true)
        if (out.map._tooltip) out.map._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
    }

    const handleMouseMove = function (e) {
        // Use cached data to avoid expensive DOM lookups on every mousemove
        if (!cachedRegion) return
        if (out.map._tooltip) out.map._tooltip.mousemove(e)
    }

    const handleMouseOut = function (e) {
        // Use cached data for consistent behavior
        if (!cachedRegion || !cachedCell) return

        const shape = cachedCell.select('.em-grid-shape')
        shape.style('fill', shape.attr('fill___') || '').attr('fill___', null)
        highlightCoxcombChart(out, cachedCell, false)
        if (out.map._tooltip) out.map._tooltip.mouseout()

        // Clear cache
        cachedRegion = null
        cachedCell = null
    }

    shapes.on('mouseenter', handleMouseOver).on('mousemove', handleMouseMove).on('mouseleave', handleMouseOut)
    charts.style('pointer-events', 'all').on('mouseenter', handleMouseOver).on('mousemove', handleMouseMove).on('mouseleave', handleMouseOut)
}

/**
 * Apply or remove hover highlight on a coxcomb chart.
 * When rings are shown, the outer circle stroke width is scaled by zoom.
 * Otherwise, the chart stroke color is changed.
 *
 * @param {Object} container - d3 selection containing the chart (centroid group or cell)
 * @param {boolean} active - true = highlight on, false = highlight off
 */
export function highlightCoxcombChart(out, container, active) {
    const k = out._lastZoomK || 1
    if (out.coxcombRings_) {
        const outline = container.select('circle.em-coxcomb-max-outline').node()
        if (outline) outline.style.setProperty('stroke-width', `${active ? 2 / k : 0.3 / k}px`, 'important')
    } else {
        container.selectAll('g.em-coxcomb-chart').style('stroke', active ? out.hoverColor_ : '#ffffff')
    }
}
