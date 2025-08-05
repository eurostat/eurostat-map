import { geoOrthographic, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { feature } from 'topojson-client'
import { json } from 'd3-fetch'
import proj4 from 'proj4'

export const appendMinimap = (map) => {
    if (!map.svg_) return

    // Retrieve geometries from map or load default if not available
    if (map.Geometries.geoJSONs.worldrg) {
        drawMinimap(map)
    } else {
        json('https://raw.githubusercontent.com/eurostat/eurostat-map/master/src/assets/topojson/WORLD_4326.json')
            .then((topoData) => {
                const features = feature(topoData, topoData.objects.CNTR_RG_20M_2020_4326).features
                map.Geometries.geoJSONs.worldrg = features // Store for future use
                drawMinimap(map)
            })
            .catch((err) => console.error('Failed to load WORLD_4326.json', err))
    }

    // Listen for zoom/pan events to update the minimap dynamically
    const debounceTime = map.minimap_?.debounce || 2 // Use minimap config or default to 300ms
    window.addEventListener(
        'estatmap:zoomed-' + map.svgId_,
        debounce((event) => {
            const map = event.detail

            // Get the updated center lat and lon from the main map
            const result = getMapCenterLatLon(map)
            if (!result) return
            const { lat, lon } = result

            // Convert the main map zoom to the minimap zoom scale
            const minimapZoom = convertMainMapZoomToMinimap(map)

            // Update the minimap projection with the new center
            map._minimapProjection.rotate([-lon, -lat])
            map._minimapProjection.scale(minimapZoom)

            // Update the minimap globe view with the new projection
            map._minimapGlobe.selectAll('path').attr('d', map._minimapPath)
        }, debounceTime) // Debounce delay (adjust as needed)
    )
}

const convertMainMapZoomToMinimap = (map) => {
    const z = map.position_.z // meters per pixel

    // Prevent division by 0
    if (!z || z <= 0) return 50 // fallback default

    // Convert meters per pixel to zoom-like value
    // 156543 is meters/pixel at zoom level 0 (Web Mercator) — tweak this for your projection if needed
    const base = 156543
    const standardZoom = Math.log2(base / z)

    // Offset for minimap — slightly lower so it stays more zoomed out
    const zoomOffset = -1 // change to 0 for exact match, or adjust as needed

    const minimapZoom = projectionScaleFromZoom(standardZoom + zoomOffset)
    return minimapZoom
}

// Maps zoom level to D3 scale — adjust scale factor for your projection
const projectionScaleFromZoom = (zoomLevel) => {
    // You can tweak this multiplier for visual fit
    return 5 * Math.pow(2, zoomLevel)
}

const drawMinimap = (map) => {
    try {
        const minimapConfig = map.minimap_ || {}
        const countryId = minimapConfig.countryId
        const x = minimapConfig.x || 80 // Default x position
        const y = minimapConfig.y || 80 // Default y position
        const z = minimapConfig.z || 160 // Default zoom level
        const color = minimapConfig.color || '#3792B6' // Default color
        const size = minimapConfig.size || 160 // Diameter
        const geometries = map.Geometries.geoJSONs.worldrg

        //container
        map._minimapContainer = map.svg_.append('g').attr('id', 'em-minimap').attr('transform', `translate(${x},${y})`) // Adjust as needed

        // Draw inner circle
        map._minimapContainer
            .append('circle')
            .attr('r', size / 2)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', 'white')
            .attr('stroke', color)
            .attr('stroke-width', 3)

        // Initialize projection
        map._minimapProjection = geoOrthographic().scale(z).translate([0, 0])
        map._minimapPath = geoPath().projection(map._minimapProjection)

        let lat, lon

        if (countryId) {
            // Center on countryId centroid
            const target = geometries.find((d) => d.properties.id === countryId)
            if (!target) {
                console.warn(`Country ID ${countryId} not found in geometries`)
                return
            }

            const [[x0, y0], [x1, y1]] = map._minimapPath.bounds(target)
            const centroid = [(x0 + x1) / 2, (y0 + y1) / 2]
            const coords = map._minimapProjection.invert(centroid)
            lon = coords[0]
            lat = coords[1]
        } else {
            // center on the main map's center
            const center = getMapCenterLatLon(map)
            if (!center) return
            lat = center.lat
            lon = center.lon
        }

        // Now center the minimap on either the country or the main map
        map._minimapProjection.rotate([-lon, -lat])

        // Define circular clip
        map._minimapContainer
            .append('defs')
            .append('clipPath')
            .attr('id', 'minimap-clip')
            .append('circle')
            .attr('r', size / 2)
            .attr('cx', 0)
            .attr('cy', 0)

        // define globe
        map._minimapGlobe = map._minimapContainer.append('g').attr('class', 'em-minimap-globe').attr('clip-path', 'url(#minimap-clip)')

        // Draw all countries (just once)
        map._minimapGlobe.selectAll('path.country').data(geometries).enter().append('path').attr('d', map._minimapPath).attr('fill', '#e0e0e0')

        // Highlight selected country
        if (countryId) {
            const target = geometries.find((d) => d.properties.id === countryId)
            map._minimapGlobe
                .append('path')
                .datum(target)
                .attr('d', map._minimapPath)
                .attr('fill', color)
                .attr('stroke', color)
                .attr('stroke-width', 0.5)
        }

        // Draw outer circle
        map._minimapContainer
            .append('circle')
            .attr('r', size / 2)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 3)
    } catch (error) {
        console.error('Error drawing minimap:', error)
    }
}

// This function returns the map's center coordinates (lat, lon) based on the map's projection.
const getMapCenterLatLon = (map) => {
    let lat, lon
    const mapProjected = [map.position_.x, map.position_.y]

    if (map.proj_ === '3035') {
        ;[lon, lat] = proj4('EPSG:3035', 'EPSG:4326', mapProjected)
    } else if (map.proj_ === '54030') {
        ;[lon, lat] = proj4('EPSG:54030', 'EPSG:4326', mapProjected)
    } else {
        ;[lon, lat] = mapProjected
    }

    const truncatedLat = lat.toFixed(2)
    const truncatedLon = lon.toFixed(2)
    return { lat: truncatedLat, lon: truncatedLon }
}

function debounce(func, wait) {
    let timeout
    return function (...args) {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}
