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

    // Flatten all region-pattern mappings
    const regionToPattern = {}

    configs.forEach((config) => {
        const { pattern = 'hatching', regionIds = [] } = config

        // Define pattern if missing
        definePattern(map, pattern)

        // Map regions to patterns
        regionIds.forEach((regionId) => {
            regionToPattern[regionId] = pattern
        })
    })

    // Select regions and overlay pattern fills
    map.svg()
        .selectAll(getRegionsSelector(map))
        .each(function (d) {
            const id = d?.properties?.id
            const pattern = regionToPattern[id]

            if (pattern) {
                const original = select(this)
                const clone = original.node().cloneNode(true)

                select(clone)
                    .attr('fill', `url(#${pattern})`)
                    .attr('pointer-events', 'none') // Don't block interactivity
                    .attr('class', (original.attr('class') || '') + ' pattern-fill-overlay')

                // Append the cloned element on top
                select(this.parentNode).append(() => clone)
            }
        })
}

function definePattern(map, patternName) {
    const defs = map.svg().select('defs')

    if (map.svg().select(`#${patternName}`).empty()) {
        const pattern = defs.append('pattern').attr('id', patternName).attr('patternUnits', 'userSpaceOnUse').attr('width', 8).attr('height', 8)

        if (patternName === 'hatching') {
            pattern.append('path').attr('d', 'M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2').attr('stroke', '#000').attr('stroke-width', 1)
        } else if (patternName === 'crosshatch') {
            pattern.append('path').attr('d', 'M0,0 l8,8 M8,0 l-8,8').attr('stroke', '#000').attr('stroke-width', 1)
        } else if (patternName === 'dots') {
            pattern.append('circle').attr('cx', 4).attr('cy', 4).attr('r', 1).attr('fill', '#000')
        } else {
            console.warn(`Unknown pattern "${patternName}", defaulting to hatching.`)
            pattern.append('path').attr('d', 'M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2').attr('stroke', '#000').attr('stroke-width', 1)
        }
    }
}
