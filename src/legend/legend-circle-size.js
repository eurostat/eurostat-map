import { select } from 'd3-selection'
import { max } from 'd3-array'
import { getFontSizeFromClass, spaceAsThousandSeparator } from '../core/utils'
import { formatLegendValues } from './legend-utils'
import { appendCircleRing } from '../layers/proportional-symbol/symbols/circle-ring'

/**
 * @description builds a nested circle legend for proportional circles
 * @param {*} out legend object
 */
export function drawCircleSizeLegend(out, container, values, sizeScale, title, titlePadding = 16, ringStyle) {
    //draw size legend title
    if (title) {
        const sizeLegendTitleFontSize = getFontSizeFromClass('em-size-legend-title')
        // the label of the largest circle reaches half its height above the circle: keep it clear of the title
        titlePadding = Math.max(titlePadding, Math.ceil((getFontSizeFromClass('em-legend-label') || 12) * 0.55)) + sizeLegendTitleFontSize
        // append title to the legend
        container
            .append('text')
            .attr('class', 'em-size-legend-title')
            .attr('id', 'em-size-legend-title')
            .attr('x', 0)
            .attr('y', sizeLegendTitleFontSize)
            .text(title)
    }

    // subtitle
    if (out.sizeLegend?.subtitle) {
        const subtitleFontSize = getFontSizeFromClass('em-legend-subtitle')
        const titleH = title ? getFontSizeFromClass('em-size-legend-title') : 0
        container
            .append('text')
            .attr('class', 'em-legend-subtitle')
            .attr('x', 0)
            .attr('y', titleH + subtitleFontSize)
            .html(out.sizeLegend.subtitle)
        titlePadding += subtitleFontSize + 2
    }

    //assign default circle radiuses if none specified by user
    let domain = sizeScale.domain()
    if (!values) {
        let min = domain[0]
        const max = domain[1]

        // If min is 0, replace with the smallest non-zero value
        if (min === 0 && sizeScale._values?.length) {
            min = Math.min(...sizeScale._values.filter((v) => v > 0))
        }

        values = [max, min]
    }

    let maxRadius = sizeScale(max(values)) //maximum circle radius to be shown in legend
    const ringWidth = maxRadius > 0 ? ringStyle?.psRingWidth_ || 0 : 0
    let x = maxRadius + ringWidth
    let y = maxRadius * 2 + titlePadding + ringWidth // y position of the first circle

    const circleLegend = container
        .append('g')
        .attr('transform', `translate(${x},${y})`)
        .attr('class', 'em-circle-size-legend')
        .attr('id', 'em-circle-size-legend')
        .attr('text-anchor', 'right')
        .style('fill', 'black')

    const itemContainer = circleLegend
        .selectAll('g')
        .data(values.filter((d) => sizeScale(d))) // Filter data before binding
        .join('g')
        .attr('class', 'em-legend-item')

    //circles
    itemContainer
        .append('circle')
        .attr('class', 'em-legend-circle')
        .style('fill', 'none')
        .attr('stroke', 'black')
        .attr('cy', (d) => -sizeScale(d))
        .attr('r', sizeScale)

    //labels
    const ownDecimals = (out.layer || out.map)?.legend_?.sizeLegend?.decimals
    let labelFormatter = out.sizeLegend?.labelFormatter || formatLegendValues(values, out._sizeDataValues, ownDecimals)
    if (out.nodeSizeLegend?.labelFormatter) {
        labelFormatter = out.nodeSizeLegend.labelFormatter
    }
    let labels = out.sizeLegend?.labels || out.nodeSizeLegend?.labels
    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', '0.35em') // ~vertical centering
        .attr('y', (d, i) => {
            let y = -1 - 2 * sizeScale(d)
            return y
        })
        .attr('x', maxRadius + 5)
        .text((d, i) => {
            if (labels && labels[i]) {
                return labels[i]
            }
            return labelFormatter(d)
        })
    //line pointing to top of corresponding circle:
    itemContainer
        .append('line')
        .style('stroke-dasharray', 2)
        .style('stroke', 'grey')
        .attr('x1', 2)
        .attr('y1', (d, i) => {
            let y = -1 - 2 * sizeScale(d)
            return y
        })
        .attr('x2', maxRadius + 5)
        .attr('y2', (d, i) => {
            let y = -1 - 2 * sizeScale(d)
            return y
        })

    spreadSizeLabels(itemContainer, sizeScale, maxRadius)

    if (ringWidth) {
        const ringRadius = maxRadius + ringWidth / 2
        const sample = circleLegend.append('g').attr('class', 'em-ring-legend-sample').attr('transform', `translate(0,${-maxRadius})`)
        appendCircleRing(sample, 50, ringStyle, 90).selectAll('circle').attr('r', ringRadius)

        const labelTop = ringWidth + 8
        circleLegend
            .append('line')
            .attr('class', 'em-ring-legend-callout')
            .attr('x1', -ringRadius)
            .attr('x2', -ringRadius)
            .attr('y1', -maxRadius)
            .attr('y2', labelTop)
            .attr('stroke', 'grey')
        circleLegend
            .append('text')
            .attr('class', 'em-legend-label em-ring-legend-label')
            .attr('text-anchor', 'start')
            .attr('x', -x)
            .attr('y', labelTop + getFontSizeFromClass('em-legend-label'))
            .text(out.sizeLegend.ringLabel)
    }

    return out
}

/**
 * Circles of similar size have their tops, and so their labels, closer together than the text is tall. Move such labels
 * down just enough, and bend their leader line to follow. Labels that are already clear are not touched.
 */
function spreadSizeLabels(itemContainer, sizeScale, maxRadius) {
    const spacing = Math.round((getFontSizeFromClass('em-legend-label') || 12) * 0.9) // closer than this, the letters touch
    const items = []
    itemContainer.each(function (d) {
        items.push({ node: this, top: -1 - 2 * sizeScale(d) })
    })
    let previous = -Infinity
    items
        .sort((a, b) => a.top - b.top) // largest circle (highest top) first
        .forEach(({ node, top }) => {
            const y = Math.max(top, previous + spacing)
            previous = y
            if (y === top) return
            const item = select(node)
            item.select('text.em-legend-label').attr('y', y)
            item.select('line')
                .attr('x2', maxRadius - 6)
                .clone()
                .attr('x1', maxRadius - 6)
                .attr('x2', maxRadius + 3)
                .attr('y2', y)
        })
}
