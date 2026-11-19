import { select } from 'd3-selection'
import { getCentroidsGroup } from '../../../core/geo/centroids'
import { getCircleRingStatData, parseCircleRingValue } from './circle-ring'
/**
 * @description Appends <circle> elements for each region in the map SVG
 * @param {*} map map instance
 * @param {*} sizeData statistical data for size e.g. map.statData('size')
 * @param {*} out rendering target (layer or inset map object)
 * @param {*} styleSource source object holding PS style/classifier state
 * @return {void}
 */
export function appendCirclesToMap(map, sizeData, out, styleSource) {
    const style = styleSource || out
    const centroidsGroup = getCentroidsGroup(out)
    const symbolContainers = centroidsGroup.selectAll('g.em-centroid')
    const transitionDuration = out.transitionDuration_ || 0

    // Disable pointer events only while an animated transition is running.
    if (transitionDuration > 0) {
        symbolContainers.style('pointer-events', 'none')
    }

    // Append circles to each symbol container
    const circles = symbolContainers
        .append('circle')
        .attr('stroke-width', style.psStrokeWidth_)
        .attr('stroke', style.psStroke_)
        .attr('fill-opacity', style.psFillOpacity_)
        .attr('stroke-opacity', style.psStrokeOpacity_)

    const setRadius = function (d) {
        const regionId = d?.properties?.id
        const datum = regionId ? sizeData.get(regionId) : null
        const rawValue = datum?.value

        // A categorical value (e.g. an "edit classification" category like "category1") has no
        // magnitude to size a symbol by - it colors the region's own polygon instead (see
        // setRegionStyles() in map-proportional-symbols.js), not the symbol. No symbol renders
        // for that region, same as genuinely missing data.
        if (rawValue == null || rawValue === ':' || Number.isNaN(+rawValue)) return 0

        const radius = style.classifierSize_(+rawValue)
        if (radius < 0) console.error('Negative radius for circle:', regionId)
        if (isNaN(radius)) console.error('NaN radius for circle:', regionId)
        return radius
    }

    const ringData = getCircleRingStatData(style)
    if (ringData) {
        const thickness = style.psRingWidth_
        const rings = symbolContainers
            .select(function (d) {
                const percentage = parseCircleRingValue(ringData.get(d?.properties?.id)?.value)
                if (percentage === undefined || !(setRadius(d) > 0)) return null

                const ring = select(this)
                    .append('g')
                    .attr('class', 'em-ps-ring')
                    .attr('aria-hidden', 'true')
                    .attr('pointer-events', 'none')
                    .attr('fill', 'none')
                    .attr('transform', 'rotate(-90)')
                    .attr('stroke-width', thickness)

                ring.append('circle').attr('class', 'em-ps-ring-track').attr('stroke', style.psRingTrackColor_)
                if (percentage > 0) {
                    ring.append('circle')
                        .attr('class', 'em-ps-ring-arc')
                        .attr('stroke', style.psRingColor_)
                        .attr('pathLength', 100)
                        .attr('stroke-dasharray', percentage === 100 ? null : `${percentage} ${100 - percentage}`)
                }
                return ring.node()
            })
            .selectAll('circle')
        const ringRadius = (d) => setRadius(d) + thickness / 2
        if (transitionDuration > 0) {
            rings
                .attr('r', 0)
                .transition()
                .duration(transitionDuration)
                .attr('r', ringRadius)
                .on('interrupt', function (d) {
                    select(this).attr('r', ringRadius(d))
                })
        } else {
            rings.attr('r', ringRadius)
        }
    }

    if (transitionDuration > 0) {
        // Ensure circles always have a radius even if the transition is interrupted.
        circles
            .attr('r', 0)
            .transition()
            .duration(transitionDuration)
            .attr('r', setRadius)
            .on('end', function () {
                select(this.parentNode).style('pointer-events', null)
            })
            .on('interrupt', function (d) {
                select(this).attr('r', setRadius(d))
                select(this.parentNode).style('pointer-events', null)
            })
    } else {
        circles.attr('r', setRadius)
    }

    return circles
}
