import { select, event as d3Event } from 'd3-selection'
import { zoomIdentity } from 'd3-zoom'
import { getCSSPropertyFromClass } from '../utils'

export const appendZoomButtons = (map) => {
    const svg = select('#' + map.svgId())

    const buttonGroup = svg
        .append('g')
        .attr('class', 'em-zoom-buttons')
        // .attr('transform', `translate(${map.width_ - 50}, 20)`)
        .style('pointer-events', 'all') // allow clicks

    const buttonSize = parseInt(getCSSPropertyFromClass('em-zoom-button', 'width')) || 30 // Default to 30px if not set
    const spacing = 40

    const zoomInBtn = buttonGroup.append('g').attr('class', 'em-zoom-in em-zoom-button').style('cursor', 'pointer')
    zoomInBtn.append('rect').attr('width', buttonSize).attr('height', buttonSize)
    zoomInBtn
        .append('text')
        .attr('x', buttonSize / 2)
        .attr('y', buttonSize / 2 + 7)
        .text('+')

    const zoomOutBtn = buttonGroup
        .append('g')
        .attr('class', 'em-zoom-out em-zoom-button')
        .attr('transform', `translate(0, ${buttonSize})`)
        .style('cursor', 'pointer')
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
