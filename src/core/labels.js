import { select } from 'd3-selection'
import { spaceAsThousandSeparator, executeForAllInsets } from './utils'

// handles all map labels e.g. stat values, or labels specified in map.labels({labels:[text:'myLabel', x:123, y: 123]})

/**
 * @function addLabelsToMap
 * @param map eurostatmap map instance
 * @param zg zoomgroup (d3 selection of zoomable elements)
 * @description appends text labels to the map. Labels can be countries, country codes, ocean names or statistical values
 */
export const addLabelsToMap = function (map, zg) {
    // set defaults
    if (!map.labels_.config) map.labels_.config = DEFAULTLABELS
    if (!map.labels_.statLabelsPositions) map.labels_.statLabelsPositions = DEFAULTSTATLABELPOSITIONS

    // clear existing or append new container
    let existing = zg.select('#em-labels')
    let labelsContainer = existing.empty() ? zg.append('g').attr('id', 'em-labels') : existing

    //for statistical values on maps without centroids, we need to add centroids initially, then add text to them later once the stat data is loaded
    if (map.labels_?.values && map._mapType !== 'ps') appendStatLabelCentroidsToMap(map, labelsContainer)

    // get labels array
    let labelsArray = map.labels_?.labels || DEFAULTLABELS[`${map.geo}_${map.proj_}.cc`]

    // append other labels to map
    if (labelsArray) {
        //common styles between all label shadows
        const shadowg = labelsContainer.append('g').attr('class', 'em-label-shadows').attr('text-anchor', 'middle')

        //common styles between all labels
        const labelg = labelsContainer.append('g').attr('class', 'em-labels').attr('text-anchor', 'middle')

        //SHADOWS
        if (map.labels_?.shadows) {
            let shadows = shadowg
                .selectAll('text')
                .data(labelsArray)
                .enter()
                .append('text')
                .attr('id', (d) => 'em-label-shadow-' + d.text.replace(/\s+/g, '-'))
                .attr('class', (d) => 'em-label-shadow em-label-shadow-' + d.class)
                .attr('x', function (d) {
                    if (d.rotate) {
                        return 0 //for rotated text, x and y positions must be specified in the transform property
                    }
                    return map._projection([d.x, d.y])[0]
                })
                .attr('y', function (d) {
                    if (d.rotate) {
                        return 0 //for rotated text, x and y positions must be specified in the transform property
                    }
                    return map._projection([d.x, d.y])[1]
                })
                .attr('dy', -7) // set y position of bottom of text
                .attr('transform', (d) => {
                    if (d.rotate) {
                        let pos = map._projection([d.x, d.y])
                        let x = pos[0]
                        let y = pos[1]
                        return `translate(${x},${y}) rotate(${d.rotate})`
                    } else {
                        return 'rotate(0)'
                    }
                })
                .text(function (d) {
                    return d.text
                }) // define the text to display
        }

        //LABEL texts
        labelg
            .selectAll('text')
            .data(labelsArray)
            .enter()
            .append('text')
            .attr('id', (d) => 'em-label-' + d.text.replace(/\s+/g, '-'))
            .attr('class', (d) => 'em-label em-label-' + d.class)
            //position label
            .attr('x', function (d) {
                if (d.rotate) {
                    return 0 //for rotated text, x and y positions must be specified in the transform property
                }
                return map._projection([d.x, d.y])[0]
            })
            .attr('y', function (d) {
                if (d.rotate) {
                    return 0 //for rotated text, x and y positions must be specified in the transform property
                }
                return map._projection([d.x, d.y])[1]
            })
            .attr('dy', -7) // set y position of bottom of text
            //transform labels which have a "rotate" property in the labels config. For rotated labels, their X,Y must also be set in the transform.
            // note: dont apply to country code labels
            .attr('transform', (d) => {
                if (d.rotate) {
                    let pos = map._projection([d.x, d.y])
                    let x = pos[0]
                    let y = pos[1]
                    return `translate(${x},${y}) rotate(${d.rotate})`
                } else {
                    return 'rotate(0)'
                }
            })
            .text(function (d) {
                return d.text
            }) // define the text to display
    }
}

/**
 * @function updateLabels
 * @description update existing map labels
 */
export const updateLabels = function (map) {
    if (map.svg_) {
        // Clear previous labels
        let prevLabels = map.svg_.selectAll('#em-labels > *')
        if (prevLabels) prevLabels.remove()

        // Main map
        if (map.labels_) {
            const masterConfig = map.labels_
            let zg = map.svg_.select('#em-zoom-group-' + map.svgId_)
            addLabelsToMap(map, zg)
            if (masterConfig.values && map.updateValuesLabels) {
                map.updateValuesLabels(map)
            }

            // Define the callback to apply to each inset
            const applyLabelsCallback = (map) => {
                if (masterConfig) {
                    let zg = map.svg_.select('#em-zoom-group-' + map.svgId_)
                    if (map.labels_) addLabelsToMap(map, zg)
                    if (masterConfig.values && map.updateValuesLabels) {
                        map.updateValuesLabels(map)
                    }
                }
            }

            // Apply labels to all insets using the executeForAllInsets function
            if (map.insetTemplates_) {
                executeForAllInsets(map.insetTemplates_, map.svgId_, applyLabelsCallback)
            }
        }
    }
}

/**
 * @description update the statistical values labels on the map
 * @param {Object} map eurostat-map map instance
 * @return {map} out
 * NOTE: THIS FUNCTION IS NOT CALLED FOR PROPORTIONAL SYMBOL MAPS
 */
export const updateValuesLabels = function (map) {
    if (!map) {
        console.warn('No map specified')
        return
    }

    //clear previous labels
    let prevLabels = map.svg_.selectAll('g.em-stat-label > *')
    prevLabels.remove()
    let prevShadows = map.svg_.selectAll('g.em-stat-label-shadow > *')
    prevShadows.remove()
    let statLabels = map.svg_.selectAll('g.em-stat-label')

    // filter stat-label elements to only show those with data
    const filterFunction = map.labels_?.statLabelsFilterFunction ? map.labels_?.statLabelsFilterFunction : defaultStatLabelFilter
    const statData = map.statData()
    statLabels
        .filter((rg) => filterFunction(rg, map))
        // .append('text')
        .each(function (d) {
            const sel = select(this)
            const labelText = statLabelsTextFunction(d, statData) // Use 'd' directly for the label text

            // Append rectangle behind label
            if (map.labels_.backgrounds) appendRect(labelText, sel)

            // Append text after the rectangle
            sel.append('text').text(labelText).attr('class', 'em-stat-label-text')
        })

    // Function to append a rectangle behind the label
    function appendRect(labelText, container) {
        const paddingX = 5 // Add some padding around the text
        const paddingY = 2 // Add some padding around the text

        // Create a temporary text element to get the size
        const bbox = container
            .append('text')
            .attr('visibility', 'hidden') // Make the temporary text invisible
            .text(labelText) // Set the label text to get its bounding box
            .node()
            .getBBox() // Get the bounding box of the text

        const labelWidth = bbox.width
        const labelHeight = bbox.height

        // Remove the temporary text element after getting the bounding box
        container.select('text[visibility="hidden"]').remove()

        // Calculate the position of the rectangle to be centered on the text
        const x = -labelWidth / 2 - paddingX // Center the rect horizontally
        const y = -labelHeight / 2 - paddingY // Center the rect vertically

        // Append rectangle with padding
        container
            .append('rect')
            .attr('x', x) // Position rect horizontally
            .attr('y', y) // Position rect vertically
            .attr('width', labelWidth + 2 * paddingX) // Width of the rect with padding
            .attr('height', labelHeight + 2 * paddingY) // Height of the rect with padding
            .attr('class', 'em-label-background')
    }

    //add shadows to labels
    if (map.labels_?.shadows) {
        map.svg_
            .selectAll('g.em-stat-label-shadow')
            .filter((rg) => filterFunction(rg, map))
            .append('text')
            .text((d) => statLabelsTextFunction(d, statData)) // Use 'd' directly for the label text)
    }
    return map
}

/**
 * @description text function for statistical labelling
 * @param {Object} d d3 selection json data element
 * @return {string}
 */
export const statLabelsTextFunction = (d, statData) => {
    if (statData && statData?.get) {
        const sv = statData.get(d.properties.id)
        if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
            return ''
        } else {
            if (sv.value !== ':') {
                return spaceAsThousandSeparator(sv.value)
            }
        }
    }
}

/**
 * @description function for filtering statistical labels
 * @param {Object} d d3 selection json data element
 * @return {boolean}
 */
const defaultStatLabelFilter = (region, map) => {
    const s = map.statData()
    const sv = s.get(region.properties.id)
    if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
        return false
    } else {
        return true
    }
}

const appendStatLabelCentroidsToMap = function (map, labelsContainer) {
    //values label shadows parent <g>
    const gsls = labelsContainer.append('g').attr('class', 'em-stat-labels-shadows').attr('text-anchor', 'middle')

    // values labels parent <g>
    const statLabelsGroup = labelsContainer.append('g').attr('class', 'em-stat-labels').attr('text-anchor', 'middle')

    // our features array
    let statLabelRegions = []

    // deafult geometries
    if (map.Geometries.geoJSONs.nutsrg) {
        //allow for stat label positioning by adding a g element here, then adding the values in the mapType updateValuesLabels function
        if (map.nutsLevel_ == 'mixed') {
            statLabelRegions = map.Geometries.geoJSONs.mixed.rg0.concat(
                map.Geometries.geoJSONs.mixed.rg1,
                map.Geometries.geoJSONs.mixed.rg2,
                map.Geometries.geoJSONs.mixed.rg3
            )
        } else {
            statLabelRegions = map.Geometries.geoJSONs.nutsrg
        }
    } else if (map.Geometries.userGeometries) {
        // user defined geometries
        statLabelRegions = map.Geometries.statisticalRegions.features
    }

    //TODO: dont add labels for regions that are not visible? what about panning and zooming though. Only really an issue for mixed NUTS.

    // stats labels
    const filteredRegions = statLabelRegions.filter((d, i, self) => i === self.findIndex((t) => t.properties.id === d.properties.id))
    statLabelsGroup
        .selectAll('g')
        .data(filteredRegions)
        .enter()
        .append('g')
        .attr('transform', function (d) {
            // use predefined label positioning
            if (map.labels_.statLabelsPositions[d.properties.id]) {
                const position = map.labels_.statLabelsPositions[d.properties.id]
                let pos = map._projection([position.x, position.y])
                let x = pos[0].toFixed(3)
                let y = pos[1].toFixed(3)
                return `translate(${x},${y})`
            } else {
                let centroid = map._pathFunction.centroid(d)

                if (map.labels_.processValueLabelCentroids) {
                    centroid = map.labels_.processValueLabelCentroids(d, centroid)
                }
                // otherwise we calculate centroids
                return 'translate(' + centroid + ')'
            }
        })
        .attr('class', 'em-stat-label')

    // stat labels shadows
    if (map.labels_?.shadows) {
        gsls.selectAll('g')
            .data(statLabelRegions)
            .enter()
            .append('g')
            .attr('transform', function (d) {
                // use predefined label positioning
                if (map.labels_.statLabelsPositions[d.properties.id]) {
                    let pos = map._projection([
                        map.labels_.statLabelsPositions[d.properties.id].x,
                        map.labels_.statLabelsPositions[d.properties.id].y,
                    ])
                    let x = pos[0].toFixed(3)
                    let y = pos[1].toFixed(3)
                    return `translate(${x},${y})`
                } else {
                    let centroid = map._pathFunction.centroid(d)

                    if (map.labels_.processValueLabelCentroids) {
                        centroid = map.labels_.processValueLabelCentroids(d, centroid)
                    }
                    // otherwise we calculate centroids
                    return 'translate(' + centroid + ')'
                }
            })

            .attr('class', 'em-stat-label-shadow')
    }
}

/**
 * Default labels for country / geographical names.
 * Using centroids would clash with proportional symbols, and are generally not ideal placements, so labels are positioned independently
 * Labels are provided for all supported languages: "en","fr" and "de" (defined using map.language())
 */
export const DEFAULTLABELS = {
    EUR_3035: {
        cc: [
            { text: 'AL', x: 5100000, y: 2060000, class: 'cc', size: 7 },
            { text: 'AT', x: 4670000, y: 2629000, class: 'cc', size: 18 },
            { text: 'BE', x: 3930000, y: 3010000, class: 'cc', size: 17 },
            { text: 'BG', x: 5567000, y: 2200000, class: 'cc', size: 22 },
            { text: 'HR', x: 4876000, y: 2455000, class: 'cc', size: 10 },
            { text: 'CY', x: 6426000, y: 1480000, class: 'cc', size: 10 },
            { text: 'CZ', x: 4707000, y: 2885000, class: 'cc', size: 18 },
            { text: 'DK', x: 4316000, y: 3621000, class: 'cc', size: 20 },
            { text: 'EE', x: 5220000, y: 3990000, class: 'cc', size: 12 },
            { text: 'FI', x: 5150000, y: 4424000, class: 'cc', size: 20 },
            { text: 'FR', x: 3767740, y: 2662817, class: 'cc', size: 22 },
            { text: 'DE', x: 4347284, y: 3093276, class: 'cc', size: 22 },
            { text: 'EL', x: 5370000, y: 1750000, class: 'cc', size: 22 },
            { text: 'HU', x: 5020000, y: 2630000, class: 'cc', size: 17 },
            { text: 'IS', x: 3040000, y: 4833000, class: 'cc', size: 10 },
            { text: 'IE', x: 3136000, y: 3394000, class: 'cc', size: 17 },
            { text: 'IT', x: 4469967, y: 2181963, class: 'cc', size: 22 },
            { text: 'LV', x: 5290000, y: 3800000, class: 'cc', size: 12 },
            { text: 'LT', x: 5190000, y: 3630000, class: 'cc', size: 12 },
            { text: 'LU', x: 4120000, y: 2940000, class: 'cc', size: 12 },
            { text: 'MT', x: 4731000, y: 1300000, class: 'cc', size: 10 },
            { text: 'ME', x: 5073000, y: 2185000, class: 'cc', size: 7 },
            { text: 'MK', x: 5300000, y: 2080000, class: 'cc', size: 10 },
            { text: 'NL', x: 4020000, y: 3208000, class: 'cc', size: 17 },
            { text: 'NO', x: 4300000, y: 4147000, class: 'cc', size: 20 },
            { text: 'PL', x: 4964000, y: 3200000, class: 'cc', size: 22 },
            { text: 'PT', x: 2800000, y: 1990000, class: 'cc', size: 18 },
            { text: 'RO', x: 5451000, y: 2600000, class: 'cc', size: 22 },
            { text: 'RS', x: 5200000, y: 2300000, class: 'cc', size: 10 },
            { text: 'SK', x: 5040000, y: 2835000, class: 'cc', size: 12 },
            { text: 'SI', x: 4655000, y: 2480000, class: 'cc', size: 10 },
            { text: 'ES', x: 3160096, y: 1900000, class: 'cc', size: 22 },
            { text: 'SE', x: 4630000, y: 4000000, class: 'cc', size: 20 },
            { text: 'CH', x: 4200000, y: 2564000, class: 'cc', size: 16 },
            { text: 'TR', x: 6510000, y: 2100000, class: 'cc', size: 22 },
            { text: 'UK', x: 3558000, y: 3250000, class: 'cc', size: 17 },
        ],
        en: [
            { text: 'MEDITERRANEAN SEA', x: 3980000, y: 1600000, class: 'seas', size: 12, letterSpacing: 7 },
            { text: 'ATLANTIC OCEAN', x: 2820000, y: 2540000, class: 'seas', size: 12, letterSpacing: 2 },
            { text: 'NORTH SEA', x: 3915000, y: 3700000, class: 'seas', size: 12 },
            { text: 'BALTIC SEA', x: 4900000, y: 3730000, class: 'seas', size: 10, rotate: -50 },
            { text: 'NORWEGIAN SEA', x: 3850000, y: 4800000, class: 'seas', size: 12, letterSpacing: 1 },
            { text: 'BLACK SEA', x: 6300000, y: 2500000, class: 'seas', size: 12, letterSpacing: 4 },
            { text: 'ALBANIA', cc: 'AL', x: 5100000, y: 2060000, class: 'countries', size: 7, rotate: 80 },
            { text: 'AUSTRIA', cc: 'AT', x: 4670000, y: 2629000, class: 'countries', size: 10 },
            { text: 'BELGIUM', cc: 'BE', x: 3900000, y: 3030000, class: 'countries', size: 7, rotate: 30 },
            { text: 'BULGARIA', cc: 'BG', x: 5567000, y: 2256000, class: 'countries', size: 12 },
            { text: 'CROATIA', cc: 'HR', x: 4876000, y: 2455000, class: 'countries', size: 7 },
            { text: 'CYPRUS', cc: 'CY', x: 6426000, y: 1480000, class: 'countries', size: 10 },
            { text: 'CZECHIA', cc: 'CZ', x: 4707000, y: 2885000, class: 'countries', size: 12 },
            { text: 'DENMARK', cc: 'DK', x: 4316000, y: 3621000, class: 'countries', size: 10 },
            { text: 'ESTONIA', cc: 'EE', x: 5220000, y: 3990000, class: 'countries', size: 7 },
            { text: 'FINLAND', cc: 'FI', x: 5150000, y: 4424000, class: 'countries', size: 12 },
            { text: 'FRANCE', cc: 'FR', x: 3767740, y: 2662817, class: 'countries', size: 12 },
            { text: 'GERMANY', cc: 'DE', x: 4347284, y: 3093276, class: 'countries', size: 12 },
            { text: 'GREECE', cc: 'EL', x: 5470000, y: 1860000, class: 'countries', size: 12 },
            { text: 'HUNGARY', cc: 'HU', x: 5020000, y: 2630000, class: 'countries', size: 10 },
            { text: 'ICELAND', cc: 'IS', x: 3040000, y: 4833000, class: 'countries', size: 10 },
            { text: 'IRELAND', cc: 'IE', x: 3136000, y: 3394000, class: 'countries', size: 10 },
            { text: 'ITALY', cc: 'IT', x: 4469967, y: 2181963, class: 'countries', size: 12 },
            { text: 'LATVIA', cc: 'LV', x: 5290000, y: 3800000, class: 'countries', size: 7 },
            { text: 'LITHUANIA', cc: 'LT', x: 5190000, y: 3630000, class: 'countries', size: 7 },
            { text: 'LUX.', cc: 'LU', x: 4120000, y: 2940000, class: 'countries', size: 7 },
            { text: 'MALTA', cc: 'MT', x: 4731000, y: 1330000, class: 'countries', size: 7 },
            { text: 'MONT.', cc: 'ME', x: 5073000, y: 2185000, class: 'countries', size: 7 },
            { text: 'N. MACEDONIA', cc: 'MK', x: 5300000, y: 2082000, class: 'countries', size: 7 },
            { text: 'NETHERLANDS', cc: 'NL', x: 3977000, y: 3208000, class: 'countries', size: 7 },
            { text: 'NORWAY', cc: 'NO', x: 4330000, y: 4147000, class: 'countries', size: 12, rotate: -75 },
            { text: 'POLAND', cc: 'PL', x: 4964000, y: 3269000, class: 'countries', size: 12 },
            { text: 'PORTUGAL', cc: 'PT', x: 2830000, y: 1990000, class: 'countries', size: 10, rotate: -75 },
            { text: 'ROMANIA', cc: 'RO', x: 5451000, y: 2600000, class: 'countries', size: 12 },
            { text: 'SERBIA', cc: 'RS', x: 5200000, y: 2300000, class: 'countries', size: 7 },
            { text: 'SLOVAKIA', cc: 'SK', x: 5040000, y: 2835000, class: 'countries', size: 7, rotate: -30 },
            { text: 'SLOVENIA', cc: 'SI', x: 4735000, y: 2522000, class: 'countries', size: 7, rotate: -30 },
            { text: 'SPAIN', cc: 'ES', x: 3160096, y: 1850000, class: 'countries', size: 12 },
            { text: 'SWEDEN', cc: 'SE', x: 4630000, y: 4100000, class: 'countries', size: 12, rotate: -75 },
            { text: 'SWITZERLAND', cc: 'CH', x: 4200000, y: 2564000, class: 'countries', size: 7 },
            { text: 'TURKEY', cc: 'TR', x: 6510000, y: 2100000, class: 'countries', size: 12 },
            { text: 'U.K.', cc: 'UK', x: 3558000, y: 3250000, class: 'countries', size: 12 },
        ],
        fr: [
            { text: 'MER MÉDITERRANÉE', x: 5472000, y: 1242000, class: 'seas', size: 12 },
            { text: 'OCÈAN ATLANTIQUE', x: 2820000, y: 2540000, class: 'seas', size: 12 },
            { text: 'MER DU NORD', x: 3915000, y: 3700000, class: 'seas', size: 12 },
            { text: 'MER BALTIQUE', x: 4900000, y: 3672000, class: 'seas', size: 10, rotate: -50 },
            { text: 'MER DE NORVÈGE', x: 3850000, y: 4800000, class: 'seas', size: 12 },
            { text: 'MER NOIRE', x: 6265000, y: 2472000, class: 'seas', size: 12 },
            { text: 'ALBANIE', x: 5100000, y: 2060000, class: 'countries', size: 7, rotate: 80 },
            { text: 'AUTRICHE', x: 4670000, y: 2629000, class: 'countries', size: 10 },
            { text: 'BELGIQUE', x: 3900000, y: 3030000, class: 'countries', size: 7, rotate: 30 },
            { text: 'BULGARIE', x: 5567000, y: 2256000, class: 'countries', size: 12 },
            { text: 'CROATIE', x: 4876000, y: 2455000, class: 'countries', size: 7 },
            { text: 'CHYPRE', x: 6426000, y: 1480000, class: 'countries', size: 10 },
            { text: 'TCHÉQUIE', x: 4707000, y: 2885000, class: 'countries', size: 12 },
            { text: 'DANEMARK', x: 4316000, y: 3621000, class: 'countries', size: 10 },
            { text: 'ESTONIE', x: 5220000, y: 3990000, class: 'countries', size: 10 },
            { text: 'FINLANDE', x: 5125000, y: 4424000, class: 'countries', size: 12 },
            { text: 'FRANCE', x: 3767740, y: 2662817, class: 'countries', size: 12 },
            { text: 'ALLEMAGNE', x: 4347284, y: 3093276, class: 'countries', size: 12 },
            { text: 'GRÈCE', x: 5420000, y: 1860000, class: 'countries', size: 12 },
            { text: 'HONGRIE', x: 5020000, y: 2654000, class: 'countries', size: 10 },
            { text: 'ISLANDE', x: 3040000, y: 4833000, class: 'countries', size: 10 },
            { text: 'IRLANDE', x: 3136000, y: 3394000, class: 'countries', size: 10 },
            { text: 'ITALIE', x: 4500000, y: 2181963, class: 'countries', size: 12 },
            { text: 'LETTONIE', x: 5290000, y: 3776000, class: 'countries', size: 10 },
            { text: 'LITUANIE', x: 5190000, y: 3630000, class: 'countries', size: 10 },
            { text: 'LUX.', x: 4120000, y: 2940000, class: 'countries', size: 7 },
            { text: 'MALTE', x: 4731000, y: 1335000, class: 'countries', size: 7 },
            { text: 'MONT.', x: 5073000, y: 2185000, class: 'countries', size: 7 },
            { text: 'MAC. DU NORD', x: 5300000, y: 2082000, class: 'countries', size: 7 },
            { text: 'PAYS-BAS', x: 3977000, y: 3208000, class: 'countries', size: 7 },
            { text: 'NORVEGE', x: 4330000, y: 4147000, class: 'countries', size: 12, rotate: -75 },
            { text: 'POLOGNE', x: 4964000, y: 3269000, class: 'countries', size: 12 },
            { text: 'PORTUGAL', x: 2836136, y: 1956179, class: 'countries', size: 10, rotate: -75 },
            { text: 'ROUMANIE', x: 5451000, y: 2600000, class: 'countries', size: 12 },
            { text: 'SERBIE', x: 5200000, y: 2300000, class: 'countries', size: 7 },
            { text: 'SLOVAQUIE', x: 5040000, y: 2835000, class: 'countries', size: 7, rotate: -30 },
            { text: 'SLOVÉNIE', x: 4735000, y: 2522000, class: 'countries', size: 7, rotate: -35 },
            { text: 'ESPAGNE', x: 3160096, y: 1850000, class: 'countries', size: 12 },
            { text: 'SUÈDE', x: 4700000, y: 4401000, class: 'countries', size: 12, rotate: -75 },
            { text: 'SUISSE', x: 4200000, y: 2564000, class: 'countries', size: 7 },
            { text: 'TURQUIE', x: 6510000, y: 2100000, class: 'countries', size: 12 },
            { text: 'ROYAUME-UNI', x: 3558000, y: 3250000, class: 'countries', size: 10 },
        ],
        de: [
            { text: 'MITTELMEER', x: 5472000, y: 1200000, class: 'seas', size: 12, letterSpacing: 7 },
            { text: 'ATLANTISCHER OZEAN', x: 2820000, y: 2540000, class: 'seas', size: 12 },
            { text: 'NORDSEE', x: 3915000, y: 3700000, class: 'seas', size: 12 },
            { text: 'OSTSEE', x: 4900000, y: 3672000, class: 'seas', size: 10, rotate: -50 },
            { text: 'NORWEGISCHE MEER', x: 3850000, y: 4800000, class: 'seas', size: 12 },
            { text: 'SCHWARZE MEER', x: 6300000, y: 2500000, class: 'seas', size: 12, letterSpacing: 1 },
            { text: 'ALBANIEN', x: 5100000, y: 2060000, class: 'countries', size: 7, rotate: 80 },
            { text: 'ÖSTERREICH', x: 4650000, y: 2629000, class: 'countries', size: 7 },
            { text: 'BELGIEN', x: 3900000, y: 3030000, class: 'countries', size: 7, rotate: 30 },
            { text: 'BULGARIEN', x: 5567000, y: 2256000, class: 'countries', size: 10 },
            { text: 'KROATIEN', x: 4876000, y: 2455000, class: 'countries', size: 7 },
            { text: 'ZYPERN', x: 6426000, y: 1480000, class: 'countries', size: 10 },
            { text: 'TSCHECHIEN', x: 4707000, y: 2885000, class: 'countries', size: 7 },
            { text: 'DÄNEMARK', x: 4316000, y: 3621000, class: 'countries', size: 10 },
            { text: 'ESTLAND', x: 5220000, y: 3990000, class: 'countries', size: 7 },
            { text: 'FINNLAND', x: 5150000, y: 4424000, class: 'countries', size: 12 },
            { text: 'FRANKREICH', x: 3767740, y: 2662817, class: 'countries', size: 12 },
            { text: 'DEUTSCHLAND', x: 4347284, y: 3093276, class: 'countries', size: 10 },
            { text: 'GRIECHENLAND', x: 5550000, y: 1500000, class: 'countries', size: 10 },
            { text: 'UNGARN', x: 5020000, y: 2630000, class: 'countries', size: 10 },
            { text: 'ISLAND', x: 3040000, y: 4833000, class: 'countries', size: 10 },
            { text: 'IRLAND', x: 3136000, y: 3394000, class: 'countries', size: 10 },
            { text: 'ITALIEN', x: 4469967, y: 2181963, class: 'countries', size: 12, rotate: 35 },
            { text: 'LETTLAND', x: 5290000, y: 3800000, class: 'countries', size: 7 },
            { text: 'LITAUEN', x: 5190000, y: 3630000, class: 'countries', size: 7 },
            { text: 'LUX.', x: 4120000, y: 2940000, class: 'countries', size: 7 },
            { text: 'MALTA', x: 4731000, y: 1330000, class: 'countries', size: 7 },
            { text: 'MONT.', x: 5073000, y: 2185000, class: 'countries', size: 7 },
            { text: 'NORDMAZEDONIEN', x: 5350000, y: 2082000, class: 'countries', size: 7 },
            { text: 'NIEDERLANDE', x: 3977000, y: 3208000, class: 'countries', size: 7 },
            { text: 'NORWEGEN', x: 4330000, y: 4147000, class: 'countries', size: 12, rotate: -75 },
            { text: 'POLEN', x: 4964000, y: 3269000, class: 'countries', size: 12 },
            { text: 'PORTUGAL', x: 2836136, y: 1956179, class: 'countries', size: 10, rotate: -75 },
            { text: 'RUMÄNIEN', x: 5451000, y: 2600000, class: 'countries', size: 12 },
            { text: 'SERBIEN', x: 5200000, y: 2300000, class: 'countries', size: 7 },
            { text: 'SLOWAKEI', x: 5040000, y: 2835000, class: 'countries', size: 7, rotate: -30 },
            { text: 'SLOWENIEN', x: 4735000, y: 2522000, class: 'countries', size: 7, rotate: -30 },
            { text: 'SPANIEN', x: 3160096, y: 1850000, class: 'countries', size: 12 },
            { text: 'SCHWEDEN', x: 4670000, y: 4180000, class: 'countries', size: 12, rotate: -75 },
            { text: 'SCHWEIZ', x: 4200000, y: 2564000, class: 'countries', size: 7 },
            { text: 'TRUTHAHN', x: 6510000, y: 2100000, class: 'countries', size: 12 },
            { text: 'VEREINIGTES', x: 3550000, y: 3520000, class: 'countries', size: 10 },
            { text: 'KÖNIGREICH', x: 3550000, y: 3420000, class: 'countries', size: 10 },
        ],
    },
    IC_32628: {
        cc: [{ text: 'ES', x: 420468, y: 3180647, class: 'cc', size: 12 }],
        en: [{ text: 'Canary Islands', x: 420468, y: 3180647, class: 'countries', size: 12 }],
        fr: [{ text: 'Les îles Canaries', x: 420468, y: 3180647, class: 'countries', size: 12 }],
        de: [{ text: 'Kanarische Inseln', x: 410000, y: 3180647, class: 'countries', size: 12 }],
    },
    GP_32620: {
        cc: [{ text: 'FR', x: 667000, y: 1740000, class: 'cc', size: 12 }],
        en: [{ text: 'Guadeloupe', x: 700000, y: 1810000, class: 'countries', size: 12 }],
    },
    MQ_32620: {
        cc: [{ text: 'FR', x: 716521, y: 1621322, class: 'cc', size: 12 }],
        en: [{ text: 'Martinique', x: 716521, y: 1621322, class: 'countries', size: 12 }],
    },
    GF_32622: {
        cc: [{ text: 'FR', x: 266852, y: 444074, class: 'cc', size: 12 }],
        en: [{ text: 'Guyane', x: 266852, y: 444074, class: 'countries', size: 12 }],
        de: [{ text: 'Guayana', x: 266852, y: 444074, class: 'countries', size: 12 }],
    },
    RE_32740: {
        cc: [{ text: 'FR', x: 348011, y: 7680000, class: 'cc', size: 10 }],
        en: [{ text: 'Réunion', x: 348011, y: 7680000, class: 'countries', size: 10 }],
    },
    YT_32738: {
        cc: [{ text: 'FR', x: 516549, y: 8593920, class: 'cc', size: 10 }],
        en: [{ text: 'Mayotte', x: 516549, y: 8593920, class: 'countries', size: 10 }],
    },
    MT_3035: {
        cc: [{ text: 'MT', x: 4719755, y: 1410701, class: 'cc', size: 10 }],
        en: [{ text: 'Malta', x: 4719755, y: 1410701, class: 'countries', size: 10 }],
    },
    PT20_32626: {
        cc: [{ text: 'PT', x: 397418, y: 4320000, class: 'cc', size: 10 }],
        en: [{ text: 'Azores', x: 397418, y: 4320000, class: 'countries', size: 10 }],
        fr: [{ text: 'Açores', x: 397418, y: 4271471, class: 'countries', size: 10 }],
        de: [{ text: 'Azoren', x: 397418, y: 4271471, class: 'countries', size: 10 }],
    },
    PT30_32628: {
        cc: [{ text: 'PT', x: 333586, y: 3624000, class: 'cc', size: 10, rotate: 30 }],
        en: [{ text: 'Madeira', x: 333586, y: 3624000, class: 'countries', size: 10, rotate: 30 }],
        fr: [{ text: 'Madère', x: 333586, y: 3624000, class: 'countries', size: 10, rotate: 30 }],
    },
    LI_3035: {
        cc: [{ text: 'LI', x: 4287060, y: 2660000, class: 'cc', size: 12 }],
        en: [{ text: 'Liechtenstein', x: 4287060, y: 2679000, class: 'countries', size: 7 }],
    },
    IS_3035: {
        cc: [{ text: 'IS', x: 3011804, y: 4960000, class: 'cc', size: 12 }],
        en: [{ text: 'Iceland', x: 3011804, y: 4960000, class: 'countries', size: 12 }],
        fr: [{ text: 'Islande', x: 3011804, y: 4960000, class: 'countries', size: 12 }],
        de: [{ text: 'Island', x: 3011804, y: 4960000, class: 'countries', size: 12 }],
    },
    SJ_SV_3035: {
        cc: [{ text: 'NO', x: 4570000, y: 6260000, class: 'cc', size: 10 }],
        en: [{ text: 'Svalbard', x: 4570000, y: 6260000, class: 'countries', size: 10 }],
        de: [{ text: 'Spitzbergen', x: 4570000, y: 6260000, class: 'countries', size: 7 }],
    },
    SJ_JM_3035: {
        cc: [{ text: 'NO', x: 3647762, y: 5420300, class: 'cc', size: 10 }],
        en: [{ text: 'Jan Mayen', x: 3647762, y: 5420300, class: 'countries', size: 7 }],
    },
    CARIB_32620: {
        cc: [
            { text: 'FR', x: 700000, y: 1810000, class: 'cc', size: 10 },
            { text: 'FR', x: 640000, y: 1590000, class: 'cc', size: 10 },
            { text: 'FR', x: 540000, y: 1962000, class: 'cc', size: 7 },
        ],
        en: [
            { text: 'Guadeloupe', x: 700000, y: 1810000, class: 'countries', size: 10 },
            { text: 'Martinique', x: 570000, y: 1590000, class: 'countries', size: 10 },
            { text: 'Saint Martin', x: 597000, y: 1962000, class: 'countries', size: 7 },
        ],
    },
    // note: WORLD x/y are in EPSG:4326 then reprojected by d3 to EPSG:54030
    WORLD_54030: {
        en: [
            { text: 'NORTH ATLANTIC', x: -45, y: 25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'SOUTH ATLANTIC', x: -15, y: -25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'SOUTH PACIFIC', x: -126, y: -25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'NORTH', x: -136, y: 25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'PACIFIC', x: -134, y: 20, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'INDIAN OCEAN', x: 80, y: -25, class: 'seas', size: 10, letterSpacing: 1 },
            { text: 'SOUTHERN OCEAN', x: -5, y: -67, class: 'seas', size: 10, letterSpacing: 6 },
        ],
    },
}

const DEFAULTSTATLABELPOSITIONS = {
    AL: { x: 5150000, y: 2000000 },
    AT: { x: 4670000, y: 2740000 },
    BE: { x: 3930000, y: 3060000 },
    BG: { x: 5567000, y: 2300000 },
    HR: { x: 4657718, y: 2400243 },
    CY: { x: 6426000, y: 1570000 },
    CH: { x: 4170000, y: 2600000 },
    CZ: { x: 4707000, y: 2950000 },
    DK: { x: 4316000, y: 3621000 },
    EE: { x: 5220000, y: 4050000 },
    FI: { x: 5150000, y: 4424000 },
    FR: { x: 3767740, y: 2662817 },
    DE: { x: 4347284, y: 3093276 },
    EL: { x: 5370000, y: 1750000 },
    HU: { x: 5020000, y: 2670000 },
    IS: { x: 3040000, y: 4833000 },
    IE: { x: 3136000, y: 3394000 },
    IT: { x: 4500000, y: 2181963 },
    LV: { x: 5290000, y: 3840000 },
    LT: { x: 5190000, y: 3670000 },
    LU: { x: 4120000, y: 2940000 },
    MT: { x: 4880000, y: 1480000 },
    ME: { x: 5073000, y: 2230000 },
    MK: { x: 5300000, y: 2130000 },
    NL: { x: 4020000, y: 3208000 },
    NO: { x: 4300000, y: 4147000 },
    PL: { x: 4964000, y: 3200000 },
    PT: { x: 2760000, y: 1990000 },
    RO: { x: 5451000, y: 2600000 },
    RS: { x: 5200000, y: 2370000 },
    SK: { x: 5040000, y: 2890000 },
    SI: { x: 4660000, y: 2550000 },
    ES: { x: 3200000, y: 2000000 },
    SE: { x: 4630000, y: 4000000 },
    TR: { x: 6510000, y: 2100000 },
    UK: { x: 3558000, y: 3250000 },
    RU: { x: 6842086, y: 3230517 },
}
