import { select } from 'd3-selection'
import { getButtonPadding, getButtonSize, getMapDrawingExtent } from './button-utils'

export const appendZoomButtons = (map) => {
    const svg = select('#' + map.svgId())
    const buttonSize = getButtonSize()

    const buttonGroup = svg.append('g').attr('class', 'em-zoom-buttons').style('pointer-events', 'all')

    if (map.zoomButtonsPosition_) {
        const userPosition = map.zoomButtonsPosition_
        buttonGroup.attr('transform', `translate(${userPosition[0]}, ${userPosition[1]})`)
    } else {
        positionZoomButtons(map, buttonGroup, buttonSize)
    }

    const zoomInBtn = buttonGroup.append('g').attr('class', 'em-zoom-in em-button').style('cursor', 'pointer')
    zoomInBtn.append('title').text('Zoom in')
    zoomInBtn.append('rect').attr('width', buttonSize).attr('height', buttonSize)
    zoomInBtn
        .append('text')
        .attr('x', buttonSize / 2)
        .attr('y', buttonSize / 2 + buttonSize * 0.2)
        .text('+')

    const zoomOutBtn = buttonGroup
        .append('g')
        .attr('class', 'em-zoom-out em-button')
        .style('cursor', 'pointer')
        .attr('transform', `translate(0, ${buttonSize})`)
    zoomOutBtn.append('title').text('Zoom out')
    zoomOutBtn.append('rect').attr('width', buttonSize).attr('height', buttonSize)
    zoomOutBtn
        .append('text')
        .attr('x', buttonSize / 2)
        .attr('y', buttonSize / 2 + buttonSize * 0.2)
        .text('-')

    zoomInBtn.on('click', function (event) {
        event.preventDefault()
        event.stopPropagation()
        zoomIn(map)
    })

    zoomOutBtn.on('click', function (event) {
        event.preventDefault()
        event.stopPropagation()
        zoomOut(map)
    })
}

export function updateZoomButtonsPosition(map) {
    const svg = select('#' + map.svgId())
    if (svg.empty() || map.zoomButtonsPosition_) return

    const buttonGroup = svg.select('.em-zoom-buttons')
    if (buttonGroup.empty()) return

    positionZoomButtons(map, buttonGroup, getButtonSize())
}

function positionZoomButtons(map, buttonGroup, buttonSize) {
    const padding = getButtonPadding()
    const extent = getMapDrawingExtent(map)
    buttonGroup.attr(
        'transform',
        `translate(${extent.x + extent.width - buttonSize - padding}, ${extent.y + extent.height - buttonSize * 2 - padding * 2})`
    )
}

function zoomIn(map) {
    map.svg_.transition().call(map.__zoomBehavior.scaleBy, 2)
}

function zoomOut(map) {
    map.svg_.transition().call(map.__zoomBehavior.scaleBy, 0.5)
}
