import { geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { json } from 'd3-fetch'
import proj4 from 'proj4'

export const appendMinimap = (map) => {
    if (!map.svg_) return
    if (!map.minimap_.size) map.minimap_.size = 150

    // Load geometries
    if (map.Geometries.geoJSONs.worldrg) {
        drawMinimap(map)
    } else {
        const worldMapTopojsonURL = window.location.hostname.includes('ec.europa.eu')
            ? 'https://ec.europa.eu/assets/estat/E/E4/gisco/eurostat-map/world-topo-2024-60M-4326.json'
            : 'https://raw.githubusercontent.com/eurostat/eurostat-map/master/src/assets/topojson/world-topo-60M.json'
        json(worldMapTopojsonURL)
            .then((topoData) => {
                const features = feature(topoData, topoData.objects.CNTR_RG_60M_2024_4326).features
                map.Geometries.geoJSONs.worldrg = features
                drawMinimap(map)
            })
            .catch((err) => console.error('Failed to load world-topo-60M.json', err))
    }

    // Listen for zoom/pan events
    window.addEventListener(
        'estatmap:zoomed-' + map.svgId_,
        debounce((e) => onMiniUpdate(e.detail), map.minimap_?.debounce || 3)
    )
}

const onMiniUpdate = (map) => {
    //console.log('Updating minimap...')
    applyMinimapRotation(map)
    applyMinimapScale(map)
    map._minimapGlobe.selectAll('path').attr('d', map._minimapPath)
}

// ---------------------------------------------------------------------------

function normalizeLon(lon) {
    return ((lon + 540) % 360) - 180
}

// Convert main map's projected center to lon/lat if needed
function getLonLatFromMapPosition(map) {
    let lon = map.position_?.x
    let lat = map.position_?.y

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null

    // If map uses a projected CRS, convert to EPSG:4326
    if (map.proj_ === '3035') {
        ;[lon, lat] = proj4('EPSG:3035', 'EPSG:4326', [lon, lat])
    } else if (map.proj_ === '54030') {
        ;[lon, lat] = proj4('EPSG:54030', 'EPSG:4326', [lon, lat])
    }

    return [lon, lat]
}

function applyMinimapRotation(map) {
    const coords = getLonLatFromMapPosition(map)
    if (!coords) return
    const [lon, lat] = coords
    map._minimapProjection.rotate([-normalizeLon(lon), -lat, 0])
}

function applyMinimapScale(map) {
    const S0 = map._minimapBaseScale || map._minimapProjection.scale()
    const k = map._lastZoomK || map.__lastTransform?.k || 1
    const exponent = 0.65
    const offset = 0.9
    const s = S0 * Math.pow(k, exponent) * offset
    const MIN = S0 * 0.35
    const MAX = S0 * 5
    map._minimapProjection.scale(Math.max(MIN, Math.min(MAX, s)))
}

const defineMinimapProjection = (map) => {
    const z = map.minimap_?.z || 160
    map._minimapProjection = geoOrthographic()
        .scale(z)
        .translate([0, 0])

    map._minimapPath = geoPath().projection(map._minimapProjection)
    map._minimapBaseScale = map._minimapProjection.scale()

    applyMinimapRotation(map)
    applyMinimapScale(map)
}

// ---------------------------------------------------------------------------

const drawMinimap = (map) => {
    try {
        const minimapConfig = map.minimap_ || {}
        const x = minimapConfig.x || 80
        const y = minimapConfig.y || 80
        const color = minimapConfig.color || '#3792B6'
        const size = minimapConfig.size || 160
        const geometries = map.Geometries.geoJSONs.worldrg

        // Container
        map._minimapContainer = map.svg_
            .append('g')
            .attr('id', 'em-minimap')
            .attr('transform', `translate(${x},${y})`)

        // Inner circle (white background)
        map._minimapContainer
            .append('circle').attr('class', 'em-minimap-inner-circle')
            .attr('r', (size / 2))
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', 'white')
            .attr('filter', 'url(#em-minimap-inner-shadow)')


        // Projection
        defineMinimapProjection(map)

        // Clip
        addDefsToMinimap(map, size)

        // Globe
        map._minimapGlobe = map._minimapContainer
            .append('g')
            .attr('class', 'em-minimap-globe')
            .attr('clip-path', 'url(#minimap-clip)')

        // Countries
        map._minimapGlobe
            .selectAll('path.country')
            .data(geometries)
            .enter()
            .append('path')
            .attr('d', map._minimapPath)
            .attr('fill', '#e0e0e0')

        // Highlight
        if (minimapConfig.highlightIds && Array.isArray(minimapConfig.highlightIds)) {
            const targets = geometries.filter((d) => minimapConfig.highlightIds.includes(d.id))
            if (targets.length) {
                targets.forEach((target) => {
                    map._minimapGlobe
                        .append('path')
                        .datum(target)
                        .attr('d', map._minimapPath)
                        .attr('fill', color)
                        .attr('stroke', color)
                        .attr('stroke-width', 0.5)
                })
            }
        }

        // Outer circle
        map._minimapContainer
            .append('circle').attr('class', 'em-minimap-outer-circle')
            .attr('r', size / 2)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 3)

        // First sync
        onMiniUpdate(map)
    } catch (error) {
        console.error('Error drawing minimap:', error)
    }
}

function addDefsToMinimap(map, size) {
    const defs = map._minimapContainer.append('defs')
    addInnerShadowToDefs(defs)

    defs.append('clipPath')
        .attr('id', 'minimap-clip')
        .append('circle')
        .attr('r', (size / 2) - 3)
        .attr('cx', 0)
        .attr('cy', 0)
}

function addInnerShadowToDefs(defs) {
    const innerShadow = defs
        .append('filter')
        .attr('id', 'em-minimap-inner-shadow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%')
        .attr('color-interpolation-filters', 'sRGB')

    innerShadow.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 3)
        .attr('result', 'blur')

    innerShadow.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 0)
        .attr('dy', 0)
        .attr('result', 'off')

    // Keep only the blurred rim that lies INSIDE the circle
    innerShadow.append('feComposite')
        .attr('in', 'SourceAlpha')
        .attr('in2', 'off')
        .attr('operator', 'arithmetic')
        .attr('k2', '1')   // + SourceAlpha
        .attr('k3', '-1')  // - blurred offset
        .attr('result', 'inner')

    innerShadow.append('feFlood')
        .attr('flood-color', '#000')
        .attr('flood-opacity', 0.4)

    innerShadow.append('feComposite')
        .attr('in2', 'inner')
        .attr('operator', 'in')
        .attr('result', 'shadow')

    // Put shadow ON TOP of the fill (multiply for natural darkening)
    innerShadow.append('feBlend')
        .attr('in', 'SourceGraphic')
        .attr('in2', 'shadow')
        .attr('mode', 'multiply')
}

// ---------------------------------------------------------------------------

function debounce(func, wait) {
    let timeout
    return function (...args) {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}
