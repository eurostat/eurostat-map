import { select } from 'd3-selection'
import { getButtonPadding, getButtonSize, getMapDrawingExtent } from './button-utils'

export const appendLegendButton = (map) => {
    const legendObj = map.legendObj_ || (typeof map.legendObj === 'function' ? map.legendObj() : undefined)
    if (!legendObj) return

    const svg = select('#' + map.svgId())
    if (svg.empty()) return

    const buttonSize = getButtonSize()
    const padding = getButtonPadding()

    const legendButton = svg.append('g').attr('class', 'em-legend-button em-button').attr('id', 'em-legend-button')

    positionLegendButton(map, legendButton, buttonSize, padding)

    legendButton.append('title').text('Show/hide legend')
    legendButton.append('rect').attr('width', buttonSize).attr('height', buttonSize).attr('class', 'em-button-rect')

    const iconPadding = Math.round(buttonSize * 0.22)
    const lineWidth = buttonSize - iconPadding * 2
    const lineHeight = Math.max(2, Math.round(buttonSize * 0.08))
    const lineGap = Math.round(buttonSize * 0.18)
    const firstY = Math.round(buttonSize * 0.22)

    legendButton
        .append('rect')
        .attr('x', iconPadding)
        .attr('y', firstY)
        .attr('width', lineWidth)
        .attr('height', lineHeight)
        .attr('pointer-events', 'none')
        .attr('class', 'em-legend-button-rect')

    legendButton
        .append('rect')
        .attr('x', iconPadding)
        .attr('y', firstY + lineGap)
        .attr('width', lineWidth)
        .attr('height', lineHeight)
        .attr('pointer-events', 'none')
        .attr('class', 'em-legend-button-rect')

    legendButton
        .append('rect')
        .attr('x', iconPadding)
        .attr('y', firstY + lineGap * 2)
        .attr('width', lineWidth)
        .attr('height', lineHeight)
        .attr('pointer-events', 'none')
        .attr('class', 'em-legend-button-rect')

    legendButton.on('click', function (event) {
        event.preventDefault()
        event.stopPropagation()

        if (typeof map.toggleLegendVisibility === 'function') {
            map.toggleLegendVisibility()
            return
        }

        const legendSvg = select('#' + legendObj.svgId)
        if (legendSvg.empty()) return

        const isHidden = legendSvg.style('display') === 'none'
        legendSvg.style('display', isHidden ? null : 'none')
    })
}

export const updateLegendButtonPosition = (map) => {
    const svg = select('#' + map.svgId())
    if (svg.empty()) return

    const legendButton = svg.select('#em-legend-button')
    if (legendButton.empty()) return

    const buttonSize = getButtonSize()
    positionLegendButton(map, legendButton, buttonSize, getButtonPadding())
}

function positionLegendButton(map, legendButton, buttonSize, padding) {
    if (map.legendButtonPosition_) {
        const userPosition = map.legendButtonPosition_
        legendButton.attr('transform', `translate(${userPosition[0]}, ${userPosition[1]})`)
        return
    }

    const extent = getMapDrawingExtent(map)
    const position = getCornerPosition(map.legendObj_?.position) || 'top left'
    const [vertical, horizontal] = position.split(' ')

    const x = horizontal === 'right' ? extent.x + extent.width - buttonSize - padding : extent.x + padding
    const y = vertical === 'bottom' ? extent.y + extent.height - buttonSize - padding : extent.y + padding

    legendButton.attr('transform', `translate(${x}, ${y})`)
}

function getCornerPosition(position) {
    if (typeof position !== 'string') return null
    const normalized = position.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
    const supported = ['top right', 'bottom right', 'top left', 'bottom left']
    return supported.includes(normalized) ? normalized : null
}
