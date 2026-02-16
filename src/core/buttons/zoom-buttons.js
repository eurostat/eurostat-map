import { select } from 'd3-selection'
import { getCSSPropertyFromClass } from '../utils'

export const appendZoomButtons = (map) => {
    const svg = select('#' + map.svgId())

    const buttonGroup = svg
        .append('g')
        .attr('class', 'em-zoom-buttons')
        // .attr('transform', `translate(${map.width_ - 50}, 20)`)
        .style('pointer-events', 'all') // allow clicks

    if (map.zoomButtonsPosition_) {
        const userPosition = map.zoomButtonsPosition_
        buttonGroup.attr('transform', `translate(${userPosition[0]}, ${userPosition[1]})`)
    } else {
        // Default position: top right corner with some padding
        const buttonSize = parseInt(getCSSPropertyFromClass('em-button', 'width')) || 30 // Default to 30px if not set
        const padding = 10
        buttonGroup.attr('transform', `translate(${map.width_ - buttonSize - padding}, ${padding})`)
    }

    const buttonSize = parseInt(getCSSPropertyFromClass('em-button', 'width')) || 30 // Default to 30px if not set

    const zoomInBtn = buttonGroup.append('g').attr('class', 'em-zoom-in em-button').style('cursor', 'pointer')
    zoomInBtn.append('title').text('Zoom in')
    zoomInBtn.append('rect').attr('width', buttonSize).attr('height', buttonSize)
    zoomInBtn
        .append('text')
        .attr('x', buttonSize / 2)
        .attr('y', buttonSize / 2 + 7)
        .text('+')

    const zoomOutBtn = buttonGroup
        .append('g')
        .attr('class', 'em-zoom-out em-button')
        .style('cursor', 'pointer')
        .attr('transform', `translate(0, ${buttonSize})`)
        .style('cursor', 'pointer')
    zoomOutBtn.append('title').text('Zoom out')
    zoomOutBtn.append('rect').attr('width', buttonSize).attr('height', buttonSize)

    zoomOutBtn
        .append('text')
        .attr('x', buttonSize / 2)
        .attr('y', buttonSize / 2 + 7)
        .text('−')

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

function zoomIn(map) {
    map.svg_.transition().call(map.__zoomBehavior.scaleBy, 2)
}

function zoomOut(map) {
    map.svg_.transition().call(map.__zoomBehavior.scaleBy, 0.5)
}
