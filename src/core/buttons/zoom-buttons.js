import { select } from 'd3-selection'
import { getButtonPadding, getButtonSize, getMapDrawingExtent } from './button-utils'

// The two zoom buttons form one stack: only its outer corners are rounded, the + button on top and the - button below.
const ZOOM_BUTTON_RADIUS = 5

const roundedButtonPath = (size, radius, { top, bottom }) => {
    const tl = top ? radius : 0
    const bl = bottom ? radius : 0
    return `M${tl},0 H${size - tl} ${tl ? `a${tl},${tl} 0 0 1 ${tl},${tl}` : ''} V${size - bl} ${bl ? `a${bl},${bl} 0 0 1 ${-bl},${bl}` : ''} H${bl} ${bl ? `a${bl},${bl} 0 0 1 ${-bl},${-bl}` : ''} V${tl} ${tl ? `a${tl},${tl} 0 0 1 ${tl},${-tl}` : ''} Z`
}

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
    zoomInBtn.append('path').attr('class', 'em-button-shape').attr('fill', 'white').attr('stroke', '#ccc').attr('d', roundedButtonPath(buttonSize, ZOOM_BUTTON_RADIUS, { top: true }))
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
    zoomOutBtn.append('path').attr('class', 'em-button-shape').attr('fill', 'white').attr('stroke', '#ccc').attr('d', roundedButtonPath(buttonSize, ZOOM_BUTTON_RADIUS, { bottom: true }))
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
    const ribbonOffsetY = map.showEstatRibbon_ ? 10 : 0
    buttonGroup.attr(
        'transform',
        `translate(${extent.x + extent.width - buttonSize - padding}, ${extent.y + extent.height - buttonSize * 2 - padding * 2 - ribbonOffsetY})`
    )
}

function zoomIn(map) {
    map.svg_.transition().call(map.__zoomBehavior.scaleBy, 2)
}

function zoomOut(map) {
    map.svg_.transition().call(map.__zoomBehavior.scaleBy, 0.5)
}
