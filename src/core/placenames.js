import { select } from 'd3-selection'
import { csv } from 'd3-fetch'
import { projectToMap } from './proj4'
import { get } from 'idb-keyval'

const PLACENAMESURL = window.location.hostname.includes('ec.europa.eu')
    ? 'https://ec.europa.eu/assets/estat/E/E4/gisco/pub/euronym/v3/UTF_LATIN/50/EUR.csv'
    : 'https://raw.githubusercontent.com/eurostat/euronym/main/pub/v3/UTF_LATIN/50/EUR.csv'

// Load once and store all labels
export async function loadPlacenames(out, url = PLACENAMESURL) {
    const raw = await csv(url)
    let filtered = raw
    if (out.placenamesFilter_) filtered = out.placenamesFilter_(raw)
    out._placenameLabels = filtered
    return filtered
}

export async function addPlacenameLabels(out) {
    if (!out._placenameLabels) {
        await loadPlacenames(out)
    }

    // Initial append
    appendPlacenameLabels(out)

    // Update on zoom/pan
    window.addEventListener('estatmap:zoomend-' + out.svgId_, (e) => {
        updatePlacenameLabels(e.detail, e.detail.__lastTransform)
    })
}

/**
 * Append filtered placenames to SVG and scale immediately based on zoom.
 */
export function appendPlacenameLabels(out) {
    const svg = out.svg_
    const zoomFactor = out.__lastTransform?.k || 1 // current zoom scale

    const filtered = getFilteredPlacenames(out)
    console.log(`Filtered ${filtered.length} placenames for zoom level ${zoomFactor}`)

    // Remove old
    svg.select('#em-placenames').remove()

    // Append group
    const group = svg
        .select('#em-zoom-group-' + out.svgId_)
        .append('g')
        .attr('id', 'em-placenames')
        .attr('class', 'em-placenames')
        .attr('pointer-events', 'none')

    // Join texts
    const texts = group
        .selectAll('text')
        .data(filtered)
        .join('text')
        .attr('x', (d) => d.screenX)
        .attr('y', (d) => d.screenY)
        .text((d) => d.name)
        .attr('class', 'em-placename')
        // Font-size scaled immediately based on zoom
        .attr('font-size', (d) => `${(13 * d.sizeFactor) / zoomFactor}px`)
        .attr('font-weight', (d) => (d.sizeFactor > 1 ? 'bold' : 'normal'))
        .attr('dy', '-0.35em')

    // Halo for readability, scaled with zoom
    const baseStrokeWidth = 3
    texts
        .clone(true)
        .lower()
        .attr('class', 'em-placename-halo')
        .attr('stroke-width', baseStrokeWidth / zoomFactor)

    out.placenameGroup_ = group
}

const getFilteredPlacenames = function (out) {
    if (!out._placenameLabels) return []

    const projection = out._projection
    const width = out.width_
    const height = out.height_
    const resolution = out.position_.z
    const padding = 30
    const maxLabels = 500

    const t = out.__lastTransform || { k: 1, x: 0, y: 0 }

    // --- visible viewport in BASE SVG COORDS ---
    const x0 = t.invertX(0) - padding
    const y0 = t.invertY(0) - padding
    const x1 = t.invertX(width) + padding
    const y1 = t.invertY(height) + padding

    const filtered = []

    for (const d of out._placenameLabels) {
        const rs = +d.rs
        const r1 = +d.r1
        if (!rs || resolution > rs) continue

        const lon = +d.lon
        const lat = +d.lat

        // 4326 → map CRS → base SVG
        const [xMap, yMap] = projectToMap(out, lon, lat)
        const [sx, sy] = projection([xMap, yMap])

        // viewport test in BASE coords
        if (sx < x0 || sx > x1 || sy < y0 || sy > y1) continue

        filtered.push({
            ...d,
            screenX: sx,   // unchanged
            screenY: sy,   // unchanged
            sizeFactor: resolution > r1 ? 1 : 1.1,
        })

        if (filtered.length >= maxLabels) break
    }

    console.log(`After filtering, ${filtered.length} placenames remain.`)
    return filtered
}


/**
 * Recompute label positions & size on zoom/pan
 */
export function updatePlacenameLabels(out, transform, maxLabels = 2000, padding = 10) {
    if (!out._placenameLabels || !out._projection) return
    appendPlacenameLabels(out, maxLabels, padding)
}
