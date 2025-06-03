import { geoOrthographic, geoPath, geoCentroid } from 'd3-geo'
import { select } from 'd3-selection'
import { feature } from 'topojson-client'
import { json } from 'd3-fetch'

export const appendMinimap = (map) => {
    if (!map.svg_) return

    const minimapConfig = map.minimap_ || {}
    const countryId = minimapConfig.countryId || 'DE' // default to China
    const x = minimapConfig.x || 80 // default x position
    const y = minimapConfig.y || 80 // default y position
    const z = minimapConfig.z || 160 // default zoom level
    const color = minimapConfig.color || '#3792B6' // default color

    const drawMinimap = (geometries) => {
        const container = map.svg_.append('g').attr('id', 'em-minimap').attr('transform', `translate(${x},${y})`) // adjust as needed
        // diameter
        const size = 160
        // Draw inner circle
        container
            .append('circle')
            .attr('r', size / 2)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', 'white')
            .attr('stroke', color)
            .attr('stroke-width', 3)

        const projection = geoOrthographic().scale(z).translate([0, 0])

        const path = geoPath().projection(projection)

        const target = geometries.find((d) => d.properties.id === countryId)
        if (!target) return console.warn(`Country ID ${countryId} not found in geometries`)

        // Center the globe on the selected country
        const [[x0, y0], [x1, y1]] = path.bounds(target)
        const centroid = [(x0 + x1) / 2, (y0 + y1) / 2]
        const [lon, lat] = projection.invert(centroid)
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

        const globe = container.append('g').attr('clip-path', 'url(#minimap-clip)')

        // Draw all countries
        globe.selectAll('path.country').data(geometries).enter().append('path').attr('d', path).attr('fill', '#e0e0e0')
        // .attr('stroke', '#999')
        // .attr('stroke-width', 0.3)

        // Highlight selected country
        globe.append('path').datum(target).attr('d', path).attr('fill', color).attr('stroke', color).attr('stroke-width', 0.5)

        // Draw outer circle
        container
            .append('circle')
            .attr('r', size / 2)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 3)
    }

    if (map.Geometries.geoJSONs.worldrg) {
        drawMinimap(map.Geometries.geoJSONs.worldrg)
    } else {
        json('https://raw.githubusercontent.com/eurostat/eurostat-map/master/src/assets/topojson/WORLD_4326.json')
            .then((topoData) => {
                const features = feature(topoData, topoData.objects.CNTR_RG_20M_2020_4326).features
                drawMinimap(features)
            })
            .catch((err) => console.error('Failed to load WORLD_4326.json', err))
    }
}
