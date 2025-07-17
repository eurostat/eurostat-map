import { getRegionsSelector } from './utils'
import { select } from 'd3-selection'

export function applyPatternFill(map, configs = []) {
    if (!Array.isArray(configs)) {
        console.warn('patternFill expects an array of configs')
        return
    }

    let defs = map.svg().select('defs')
    if (defs.empty()) {
        defs = map.svg().append('defs')
    }

    // Prepare: map each regionId to an array of patternIds
    const regionToPatternIds = {}

    configs.forEach((config) => {
        const { pattern = 'hatching', regionIds = [], color = '#000', strokeWidth = 1, customPattern } = config

        let patternId

        if (customPattern) {
            const idMatch = customPattern.match(/id=['"]([^'"]+)['"]/)
            if (idMatch) {
                patternId = idMatch[1]

                if (map.svg().select(`#${patternId}`).empty()) {
                    defs.node().insertAdjacentHTML('beforeend', customPattern)
                }
            } else {
                console.warn('customPattern must include an id attribute.')
                return
            }
        } else {
            const colorKey = color.replace('#', '').toLowerCase()
            patternId = `${pattern}-${colorKey}-sw${strokeWidth}`
            definePattern(map, patternId, pattern, color, strokeWidth)
        }

        config.patternId = patternId

        regionIds.forEach((regionId) => {
            if (!regionToPatternIds[regionId]) {
                regionToPatternIds[regionId] = []
            }
            regionToPatternIds[regionId].push(patternId)
        })
    })

    // Apply all patterns for each region (stacking them)
    map.svg()
        .selectAll(getRegionsSelector(map))
        .each(function (d) {
            const id = d?.properties?.id
            const patternIds = regionToPatternIds[id]

            if (patternIds && patternIds.length) {
                const original = select(this)

                patternIds.forEach((patternId) => {
                    const clone = original.node().cloneNode(true)

                    select(clone)
                        .attr('fill', `url(#${patternId})`)
                        .attr('pointer-events', 'none')
                        .attr('class', (original.attr('class') || '') + 'pattern-fill-overlay')

                    select(this.parentNode).append(() => clone)
                })
            }
        })
}

function definePattern(map, patternId, patternName, color, strokeWidth) {
    const defs = map.svg().select('defs')

    if (
        map
            .svg()
            .select(`#${CSS.escape(patternId)}`)
            .empty()
    ) {
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
