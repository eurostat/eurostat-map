import { getRegionsSelector } from './utils'
import { select } from 'd3-selection'

export function applyPatternFill(map, configs = []) {
    if (!Array.isArray(configs)) {
        console.warn('patternFill expects an array of configs')
        return
    }

    // Add <defs> if missing
    let defs = map.svg().select('defs')
    if (defs.empty()) {
        defs = map.svg().append('defs')
    }

    // Map region IDs to their specific patternId
    const regionToPatternId = {}

    configs.forEach((config) => {
        const { pattern = 'hatching', regionIds = [], color = '#000', strokeWidth = 1 } = config

        const colorKey = color.replace('#', '').toLowerCase() // e.g., 'ff0000'
        const patternId = `${pattern}-${colorKey}-sw${strokeWidth}` // e.g., 'hatching-ff0000-sw1'
        config.patternId = patternId // Store patternId in config for legend etc.
        config.strokeWidth = strokeWidth // Store strokeWidth in config for legend etc.

        // Define pattern if missing
        definePattern(map, patternId, pattern, color, strokeWidth)

        // Map regions to their specific patternId
        regionIds.forEach((regionId) => {
            regionToPatternId[regionId] = patternId
        })
    })

    // Select regions and overlay pattern fills
    map.svg()
        .selectAll(getRegionsSelector(map))
        .each(function (d) {
            const id = d?.properties?.id
            const patternId = regionToPatternId[id]

            if (patternId) {
                const original = select(this)
                const clone = original.node().cloneNode(true)

                select(clone)
                    .attr('fill', `url(#${patternId})`) // ✅ now uses correct patternId per region
                    .attr('pointer-events', 'none')
                    .attr('class', (original.attr('class') || '') + ' pattern-fill-overlay')

                // Append the cloned element on top
                select(this.parentNode).append(() => clone)
            }
        })
}

function definePattern(map, patternId, patternName, color, strokeWidth) {
    const defs = map.svg().select('defs')

    if (map.svg().select(`#${patternId}`).empty()) {
        const pattern = defs.append('pattern').attr('id', patternId).attr('patternUnits', 'userSpaceOnUse').attr('width', 8).attr('height', 8)

        if (patternName === 'hatching') {
            pattern.append('path').attr('d', 'M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2').attr('stroke', color).attr('stroke-width', strokeWidth)
        } else if (patternName === 'crosshatch') {
            pattern.append('path').attr('d', 'M0,0 l8,8 M8,0 l-8,8').attr('stroke', color).attr('stroke-width', strokeWidth)
        } else if (patternName === 'dots') {
            pattern.append('circle').attr('cx', 4).attr('cy', 4).attr('r', strokeWidth).attr('fill', color)
        } else {
            console.warn(`Unknown pattern "${patternName}", defaulting to hatching.`)
            pattern.append('path').attr('d', 'M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2').attr('stroke', color).attr('stroke-width', strokeWidth)
        }
    }
}
