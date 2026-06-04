import { select } from 'd3-selection'
import { getCSSPropertyFromClass } from '../utils'

export const appendLegendButton = (map) => {
    const legendObj = map.legendObj_ || (typeof map.legendObj === 'function' ? map.legendObj() : undefined)
    if (!legendObj) return

    const svg = select('#' + map.svgId())
    if (svg.empty()) return

    const buttonSize = parseInt(getCSSPropertyFromClass('em-button', 'width')) || 30
    const padding = 10

    let headerOffset = 0
    if (map.header_ && !map.isInset) {
        const header = svg.select('#em-header-' + map.svgId_)
        const hb = header.empty() ? null : header.node()?.getBBox?.()
        const headerPadding = map.headerPadding_ ? map.headerPadding_ : 20
        if (hb) headerOffset = hb.height + headerPadding
    }

    const legendButton = svg.append('g').attr('class', 'em-legend-button em-button').attr('id', 'em-legend-button')

    if (map.legendButtonPosition_) {
        const userPosition = map.legendButtonPosition_
        legendButton.attr('transform', `translate(${userPosition[0]}, ${userPosition[1] + headerOffset})`)
    } else {
        let y = padding + headerOffset

        if (!map.header_ && !map.isInset) {
            const titleY = map.title_ && map.titlePosition_ ? map.titlePosition_[1] : 0
            const subtitleY = map.subtitle_ && map.subtitlePosition_ ? map.subtitlePosition_[1] : 0
            const maxTitleY = Math.max(titleY, subtitleY)
            if (maxTitleY > 0) {
                y = maxTitleY + padding + 6
            }
        }

        legendButton.attr('transform', `translate(${padding}, ${y})`)
    }

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
