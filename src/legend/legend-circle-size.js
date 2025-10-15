import { max } from 'd3-array'
import { getFontSizeFromClass, spaceAsThousandSeparator } from '../core/utils'

/**
 * @description builds a nested circle legend for proportional circles
 * @param {*} out legend object
 */
export function drawCircleSizeLegend(out, container, values, sizeScale, title, titlePadding = 16) {
    //draw size legend title
    if (title) {
        const sizeLegendTitleFontSize = getFontSizeFromClass('em-size-legend-title')
        titlePadding += sizeLegendTitleFontSize // add title font size to padding
        // append title to the legend
        container
            .append('text')
            .attr('class', 'em-size-legend-title')
            .attr('id', 'em-size-legend-title')
            .attr('x', 0)
            .attr('y', sizeLegendTitleFontSize)
            .text(title)
    }

    //assign default circle radiuses if none specified by user
    let domain = sizeScale.domain()
    if (!values) {
        // default legend values if unspecified by user
        values = [domain[1], domain[0]]
    }

    let maxRadius = sizeScale(max(values)) //maximum circle radius to be shown in legend
    let x = maxRadius
    let y = maxRadius * 2 + titlePadding // y position of the first circle

    const itemContainer = container
        .append('g')
        .attr('transform', `translate(${x},${y})`)
        .attr('class', 'em-circle-size-legend')
        .attr('id', 'em-circle-size-legend')
        .attr('text-anchor', 'right')
        .style('fill', 'black')
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
    const labelFormatter = out.sizeLegend?.labelFormatter || spaceAsThousandSeparator
    itemContainer
        .append('text')
        .attr('class', 'em-legend-label')
        .attr('dy', '0.35em') // ~vertical centering
        .attr('y', (d, i) => {
            let y = -1 - 2 * sizeScale(d)
            return y
        })
        .attr('x', maxRadius + 5)
        .text((d) => {
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

    return out
}
