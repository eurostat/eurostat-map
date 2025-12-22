import { select } from 'd3-selection'
import { csv, autoType } from 'd3-fetch'
import { projectToMap } from './proj4'
import { get } from 'idb-keyval'

const PLACENAMESURL = window.location.hostname.includes('ec.europa.eu')
    ? 'https://ec.europa.eu/assets/estat/E/E4/gisco/pub/euronym/v3/UTF_LATIN/50/EUR.csv'
    : 'https://raw.githubusercontent.com/eurostat/euronym/main/pub/v3/UTF_LATIN/50/EUR.csv'

// Load once and store all labels
export async function loadPlacenames(out, url = PLACENAMESURL) {
    const raw = await csv(url, autoType)
    out._placenameLabels = raw
    return raw
}

export async function addPlacenameLabels(out) {
    if (!out._placenameLabels) {
        await loadPlacenames(out)
    }

    // Initial append
    appendPlacenameLabels(out)

    // Update on zoom/pan
    window.addEventListener('estatmap:zoomed-' + out.svgId_, (e) => {
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
    const padding = 30 //viewport padding
    const maxLabels = 500 // limit to 500 labels

    // Filter based on resolution and screen position

    const filtered = []
    for (const d of out._placenameLabels || []) {
        const rs = +d.rs
        const r1 = +d.r1
        if (!rs || resolution > rs) continue // skip if too zoomed out

        const lon = +d.lon
        const lat = +d.lat
        const [xMap, yMap] = projectToMap(out, lon, lat)
        const [sx, sy] = projection([xMap, yMap])

        if (sx < padding || sx > width - padding || sy < padding || sy > height - padding) continue

        filtered.push({
            ...d,
            screenX: sx,
            screenY: sy,
            sizeFactor: resolution > r1 ? 1 : 1.1, //exxagerate label size using r1
        })

        if (filtered.length >= maxLabels) break
    }

    return filtered
}

/**
 * Recompute label positions & size on zoom/pan
 */
export function updatePlacenameLabels(out, transform, maxLabels = 2000, padding = 10) {
    if (!out._placenameLabels || !out._projection) return
    appendPlacenameLabels(out, maxLabels, padding)
}
