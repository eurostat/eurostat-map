/**
 * locations.js
 * Adds point locations (circles, pins, squares, diamonds, crosses) to a
 * eurostat-map instance.
 *
 * ── Integration (in map-template.js) ─────────────────────────────────────────
 *
 *   import { attachLocationsApi } from './locations'
 *
 *   // Inside mapTemplate(), after `out` is created and before `return out`:
 *   attachLocationsApi(out)
 *
 *   // Inside buildMapTemplate(), after drawBackgroundMap / addCentroidsToMap:
 *   if (out._locations_?.length) updateLocations(out)
 *
 * ── Usage (consumer) ──────────────────────────────────────────────────────────
 *
 *   map.addLocation({ x: 13.4, y: 52.5, label: 'Berlin', shape: 'pin' })
 *
 *   // Bulk set (replaces all):
 *   map.locations([
 *     { x: 2.35, y: 48.85, label: 'Paris' },
 *     { x: -0.12, y: 51.50, label: 'London', fill: '#00aeef' },
 *   ])
 *
 *   map.removeLocation('my-id')
 *   map.clearLocations()
 *   map.updateLocations()   // manual re-render
 */

import { select } from 'd3-selection'

// ─── Shape constants ───────────────────────────────────────────────────────────

export const LOCATION_SHAPES = {
    CIRCLE: 'circle',
    SQUARE: 'square',
    PIN: 'pin',
    DIAMOND: 'diamond',
    CROSS: 'cross',
    STAR: 'star',
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_LOCATION = {
    shape: LOCATION_SHAPES.CIRCLE,
    radius: 6,
    fill: '#e84040',
    opacity: 1,
    stroke: '#fff',
    strokeWidth: 1.5,
    label: '',
    labelOffset: [7, -4], // [dx, dy] from projected point, px
    labelStyle: {
        fontSize: '12px',
        fontFamily: 'inherit',
        fill: '#222',
        opacity: 1,
        stroke: '#fff',
        strokeWidth: 3,
        paintOrder: 'stroke',
    },
    id: undefined,
}

// ─── Auto-ID counter ───────────────────────────────────────────────────────────

let _idCounter = 0
const nextId = () => `em-loc-${++_idCounter}`

// ─── Shape path builders ───────────────────────────────────────────────────────

/**
 * Returns the SVG `d` string for the given shape, centred on (0,0).
 * Returns null for 'circle' (uses <circle> instead).
 */
const shapePath = (shape, r) => {
    switch (shape) {
        case LOCATION_SHAPES.SQUARE:
            return `M${-r},${-r} h${2 * r} v${2 * r} h${-2 * r} Z`

        case LOCATION_SHAPES.DIAMOND:
            return `M0,${-r * 1.4} L${r},0 L0,${r * 1.4} L${-r},0 Z`

        case LOCATION_SHAPES.CROSS: {
            const t = r * 0.35
            return [`M${-t},${-r}`, `H${t}`, `V${-t}`, `H${r}`, `V${t}`, `H${t}`, `V${r}`, `H${-t}`, `V${t}`, `H${-r}`, `V${-t}`, `H${-t}`, 'Z'].join(
                ' '
            )
        }

        case LOCATION_SHAPES.PIN: {
            // Teardrop: a circle at the top, tapering to a tip below.
            // The projected coordinate aligns with the circle centre.
            const tipY = r * 2.4
            const angle = Math.asin(r / tipY)
            const tx = Math.cos(angle) * r
            const ty = Math.sin(angle) * r // tangent point y (positive = below centre)
            return [
                `M0,${-r}`,
                `A${r},${r},0,1,1,${-tx},${ty}`, // arc to left tangent
                `L0,${tipY}`, // left edge to tip
                `L${tx},${ty}`, // tip to right tangent
                `A${r},${r},0,0,1,0,${-r}`, // arc back to top
                'Z',
            ].join(' ')
        }

        case LOCATION_SHAPES.STAR: {
            const points = 5
            const outerR = r
            const innerR = r * 0.4
            const step = Math.PI / points
            const d = []
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerR : innerR
                const angle = i * step - Math.PI / 2
                d.push(`${i === 0 ? 'M' : 'L'}${(radius * Math.cos(angle)).toFixed(3)},${(radius * Math.sin(angle)).toFixed(3)}`)
            }
            d.push('Z')
            return d.join(' ')
        }

        case LOCATION_SHAPES.CIRCLE:
        default:
            return null
    }
}

// ─── Projection helper ────────────────────────────────────────────────────────

/** Projects [x, y] geographic coords → [px, py] SVG coords, or null on failure. */
const project = (map, x, y) => {
    if (!map._projection) return null
    try {
        const px = map._projection([x, y])
        return px && !isNaN(px[0]) && !isNaN(px[1]) ? px : null
    } catch (_) {
        return null
    }
}

// ─── Group accessor ────────────────────────────────────────────────────────────

/** Gets or creates the <g> that holds all location markers inside the zoom group. */
const getLocationsGroup = (map) => {
    const zoomGroup = map.svg().select('#em-zoom-group-' + map.svgId_)
    let g = zoomGroup.select('#em-locations-' + map.svgId_)
    if (g.empty()) {
        g = zoomGroup
            .append('g')
            .attr('id', 'em-locations-' + map.svgId_)
            .attr('class', 'em-locations')
            .style('pointer-events', 'none')
    }
    return g
}

// ─── Core render ──────────────────────────────────────────────────────────────

/**
 * (Re-)renders all locations stored in map._locations_.
 * Uses a keyed join so it can be called on every zoom/rebuild without duplication.
 */
export const updateLocations = (map) => {
    if (!map._locations_?.length) {
        map.svg()
            ?.select('#em-locations-' + map.svgId_)
            ?.remove()
        return
    }

    const g = getLocationsGroup(map)

    const groups = g.selectAll('g.em-location').data(map._locations_, (d) => d.id)

    groups.exit().remove()

    const entered = groups
        .enter()
        .append('g')
        .attr('class', 'em-location')
        .attr('id', (d) => 'em-loc-' + d.id)

    entered.merge(groups).each(function (d) {
        const grp = select(this)
        const coords = project(map, d.x, d.y)

        if (!coords) {
            grp.attr('display', 'none')
            return
        }

        grp.attr('display', null).attr('transform', `translate(${coords[0].toFixed(3)},${coords[1].toFixed(3)})`)

        // ── Symbol ──────────────────────────────────────────────
        if (d.shape === LOCATION_SHAPES.CIRCLE) {
            grp.select('path.em-loc-symbol').remove()
            let sym = grp.select('circle.em-loc-symbol')
            if (sym.empty()) sym = grp.append('circle').attr('class', 'em-loc-symbol')
            sym.attr('r', d.radius).attr('fill', d.fill).attr('fill-opacity', d.opacity).attr('stroke', d.stroke).attr('stroke-width', d.strokeWidth)
        } else {
            grp.select('circle.em-loc-symbol').remove()
            let sym = grp.select('path.em-loc-symbol')
            if (sym.empty()) sym = grp.append('path').attr('class', 'em-loc-symbol')
            sym.attr('d', shapePath(d.shape, d.radius))
                .attr('fill', d.fill)
                .attr('fill-opacity', d.opacity)
                .attr('stroke', d.stroke)
                .attr('stroke-width', d.strokeWidth)
        }

        // ── Label ────────────────────────────────────────────────
        grp.select('text.em-loc-label').remove()
        if (d.label) {
            const ls = d.labelStyle
            grp.append('text')
                .attr('class', 'em-loc-label')
                .attr('x', d.labelOffset[0])
                .attr('y', d.labelOffset[1])
                .attr('font-size', ls.fontSize)
                .attr('font-family', ls.fontFamily)
                .attr('fill', ls.fill)
                .attr('opacity', ls.opacity)
                .attr('stroke', ls.stroke)
                .attr('stroke-width', ls.strokeWidth)
                .attr('paint-order', ls.paintOrder)
                .text(d.label)
        }
    })
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Attaches the locations API to a map-template instance.
 * Call once inside mapTemplate() before returning `out`.
 */
export const attachLocationsApi = (out) => {
    out._locations_ = []

    /**
     * Add a single location marker.
     *
     * @param {Object}   config
     * @param {number}   config.x              Geographic X (longitude / easting)
     * @param {number}   config.y              Geographic Y (latitude / northing)
     * @param {string}   [config.id]           Stable id; auto-generated if omitted
     * @param {string}   [config.label]        Text label
     * @param {string}   [config.shape]        'circle'|'square'|'pin'|'diamond'|'cross'
     * @param {string}   [config.fill]         Fill colour
     * @param {number}   [config.opacity]      Fill opacity 0–1
     * @param {number}   [config.radius]       Symbol size in px
     * @param {string}   [config.stroke]       Stroke colour
     * @param {number}   [config.strokeWidth]  Stroke width in px
     * @param {number[]} [config.labelOffset]  [dx, dy] offset from point in px
     * @param {Object}   [config.labelStyle]   Overrides for label text style
     * @returns {out}
     */
    out.addLocation = function (config) {
        if (config.x === undefined || config.y === undefined) {
            console.warn('[eurostat-map] addLocation: x and y are required.', config)
            return out
        }

        const loc = {
            ...DEFAULT_LOCATION,
            ...config,
            labelStyle: { ...DEFAULT_LOCATION.labelStyle, ...(config.labelStyle ?? {}) },
            id: config.id ?? nextId(),
        }

        // Upsert: replace if id already exists
        const idx = out._locations_.findIndex((l) => l.id === loc.id)
        if (idx !== -1) out._locations_[idx] = loc
        else out._locations_.push(loc)

        if (out.svg_ && out._projection) updateLocations(out)
        return out
    }

    /**
     * Remove a location by id.
     * @param {string} id
     * @returns {out}
     */
    out.removeLocation = function (id) {
        out._locations_ = out._locations_.filter((l) => l.id !== id)
        if (out.svg_ && out._projection) updateLocations(out)
        return out
    }

    /**
     * Remove all location markers.
     * @returns {out}
     */
    out.clearLocations = function () {
        out._locations_ = []
        out.svg_?.select('#em-locations-' + out.svgId_)?.remove()
        return out
    }

    /**
     * Bulk getter / setter.
     * Passing an array replaces all existing locations.
     *
     * @param {Object[]} [arr]
     * @returns {Object[]|out}
     */
    out.locations = function (arr) {
        if (!arguments.length) return out._locations_
        out._locations_ = (arr ?? []).map((cfg) => ({
            ...DEFAULT_LOCATION,
            ...cfg,
            labelStyle: { ...DEFAULT_LOCATION.labelStyle, ...(cfg.labelStyle ?? {}) },
            id: cfg.id ?? nextId(),
        }))
        if (out.svg_ && out._projection) updateLocations(out)
        return out
    }

    /**
     * Manually trigger a re-render (e.g. after programmatic zoom or projection change).
     * @returns {out}
     */
    out.updateLocations = function () {
        updateLocations(out)
        return out
    }

    return out
}
