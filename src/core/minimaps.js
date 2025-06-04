import { geoOrthographic, geoPath, geoCentroid } from 'd3-geo'
import { select } from 'd3-selection'
import { feature } from 'topojson-client'
import { json } from 'd3-fetch'
import proj4 from 'proj4'

let projection
let path

export const appendMinimap = (map) => {
    if (!map.svg_) return

    //load proj4 definitions for dynamic minimaps that are linked to the main map view
    if (!map.minimap_.countryId) {
        if (map.proj_ === '3035') {
            proj4.defs('EPSG:3035', '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs')
        } else if (map.proj_ === '54030') {
            proj4.defs('EPSG:54030', '+proj=robin +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs')
        }
    }

    // retrieve geometries from map or load default if not available
    if (map.Geometries.geoJSONs.worldrg) {
        drawMinimap(map)
    } else {
        json('https://raw.githubusercontent.com/eurostat/eurostat-map/master/src/assets/topojson/WORLD_4326.json')
            .then((topoData) => {
                const features = feature(topoData, topoData.objects.CNTR_RG_20M_2020_4326).features
                map.Geometries.geoJSONs.worldrg = features // store for future use
                drawMinimap(map)
            })
            .catch((err) => console.error('Failed to load WORLD_4326.json', err))
    }

    window.addEventListener('map:zoomed', (event) => {
        const map = event.detail
        const z = map.minimap_.z || 160 // default zoom level
        const newX = map.position_.x
        const newY = map.position_.y
        const countryId = map.minimap_.countryId

        const result = getMapCenterLatLon(map, countryId, projection, path)
        if (!result) return
        const { lat, lon } = result

        projection.rotate([-lon, -lat])

        // Update the minimap globe view
        select('#em-minimap .em-minimap-globe').selectAll('path').attr('d', path)
    })
}

const drawMinimap = (map) => {
    try {
        const minimapConfig = map.minimap_ || {}
        const countryId = minimapConfig.countryId
        const x = minimapConfig.x || 80 // default x position
        const y = minimapConfig.y || 80 // default y position
        const z = minimapConfig.z || 160 // default zoom level
        const color = minimapConfig.color || '#3792B6' // default color
        const container = map.svg_.append('g').attr('id', 'em-minimap').attr('transform', `translate(${x},${y})`) // adjust as needed
        const size = minimapConfig.size || 160 // diameter
        const geometries = map.Geometries.geoJSONs.worldrg

        // Draw inner circle
        container
            .append('circle')
            .attr('r', size / 2)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', 'white')
            .attr('stroke', color)
            .attr('stroke-width', 3)

        projection = geoOrthographic().scale(z).translate([0, 0])
        path = geoPath().projection(projection)

        let lat, lon

        if (countryId) {
            // Center on countryId
            const target = geometries.find((d) => d.properties.id === countryId)
            if (!target) {
                console.warn(`Country ID ${countryId} not found in geometries`)
                return null
            }

            const [[x0, y0], [x1, y1]] = path.bounds(target)
            const centroid = [(x0 + x1) / 2, (y0 + y1) / 2]
            const coords = projection.invert(centroid)
            lon = coords[0]
            lat = coords[1]
        } else {
            const center = getMapCenterLatLon(map, geometries, countryId, projection, path)
            if (!center) return null
            lat = center.lat
            lon = center.lon
        }

        // Now center the minimap on either the country or the main map
        projection.rotate([-lon, -lat])

        // Define circular clip
        container
            .append('defs')
            .append('clipPath')
            .attr('id', 'minimap-clip')
            .append('circle')
            .attr('r', size / 2)
            .attr('cx', 0)
            .attr('cy', 0)

        const globe = container.append('g').attr('class', 'em-minimap-globe').attr('clip-path', 'url(#minimap-clip)')

        // Draw all countries
        globe.selectAll('path.country').data(geometries).enter().append('path').attr('d', path).attr('fill', '#e0e0e0')

        // Highlight selected country
        if (countryId) {
            const target = geometries.find((d) => d.properties.id === countryId)
            globe.append('path').datum(target).attr('d', path).attr('fill', color).attr('stroke', color).attr('stroke-width', 0.5)
        }

        // Draw outer circle
        container
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

    return { lat, lon }
}
