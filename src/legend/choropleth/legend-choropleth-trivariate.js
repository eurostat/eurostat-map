// legend-choropleth-trivariate.js
import { select } from 'd3-selection'
import * as Legend from '../legend'

/**
 * Legend for trivariate (ternary) choropleth maps.
 * Uses the ternaryColorClassifier from the map for colors, mixes, and center.
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    const out = Legend.legend(map)

    // Default width (triangle scales proportionally)
    out.width = config?.width || 150
    out.fontSize = config?.fontSize || 12
    out.padding = config?.padding || 2

    // Labels (fallback defaults)
    out.topText = config?.topText || 'Variable 1'
    out.leftText = config?.leftText || 'Variable 2'
    out.rightText = config?.rightText || 'Variable 3'

    //override attribute values with config values
    if (config) {
        for (let key in config) {
            out[key] = config[key]
        }
    }

    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        if (out.lgg.node()) {
            const map = out.map
            // Classifier (must be created by map using ternaryColorClassifier)
            const classifier = map.colorClassifier_ // prebuilt by map
            if (!classifier) {
                console.error('Trivariate legend: map.colorClassifier_ missing')
                return out
            }

            // Draw legend background box and title if provided
            out.makeBackgroundBox()
            if (out.title) out.addTitle()
            if (out.subtitle) out.addSubtitle()

            drawTernaryLegend()

            // Draw the trivariate legend triangle
            out.setBoxDimension()
        }
    }

    function drawTernaryLegend() {
        const lgg = out.lgg
        const map = out.map
        const classifier = map.colorClassifier_
        const sqrt3over2 = 0.866025
        const w = out.width,
            h = w * sqrt3over2
        const fontSize = out.fontSize
        const padding = out.padding
        const selectionColor = out.selectionColor || 'red'
        const tt = map._tooltip

        //  container
        const container = lgg // reuse out.lgg directly
            .attr('class', 'em-ternary-legend') // keep the class
            .attr('width', w)
            .attr('height', h + 4 * padding + 2 * fontSize)

        // Labels
        container
            .append('text')
            .attr('x', w / 2)
            .attr('y', padding + fontSize)
            .text(out.topText)
            .attr('font-size', fontSize)
            .attr('text-anchor', 'middle')
        container
            .append('text')
            .attr('x', 0)
            .attr('y', 3 * padding + 2 * fontSize + h)
            .text(out.leftText)
            .attr('font-size', fontSize)
            .attr('text-anchor', 'start')
        container
            .append('text')
            .attr('x', w)
            .attr('y', 3 * padding + 2 * fontSize + h)
            .text(out.rightText)
            .attr('font-size', fontSize)
            .attr('text-anchor', 'end')

        const g = container.append('g').attr('transform', `translate(0,${2 * padding + fontSize})`)

        // Common polygon hover behavior
        const setAttributes = (elt, color, text) => {
            elt.attr('fill', color)
                .on('mouseover', function (e) {
                    select(this).attr('fill', selectionColor)
                    if (tt && text) {
                        tt.mouseover(text)
                    }
                })
                .on('mousemove', function (e) {
                    if (tt && text) tt.mousemove(e)
                })
                .on('mouseout', function (e) {
                    select(this).attr('fill', color)
                    if (tt) tt.mouseout(e)
                })
        }

        // --- Draw the 7 segments ---
        if (out?.texts) {
            classifier.texts = out.texts
        }

        // Outer trapeziums for categories 0, 1, 2
        const t0 = g.append('polygon').attr(
            'points',
            `
    0,${h} ${w / 3},${h} ${w / 2},${(2 * h) / 3} ${w / 6},${(2 * h) / 3}
`
        )
        setAttributes(t0, classifier.colors[0], classifier.texts?.['0'])

        const t1 = g.append('polygon').attr(
            'points',
            `
    ${w / 2},0 ${(2 * w) / 3},${h / 3} ${w / 2},${(2 * h) / 3} ${w / 3},${h / 3}
`
        )
        setAttributes(t1, classifier.colors[1], classifier.texts?.['1'])

        const t2 = g.append('polygon').attr(
            'points',
            `
    ${w},${h} ${(5 * w) / 6},${(2 * h) / 3} ${w / 2},${(2 * h) / 3} ${(2 * w) / 3},${h}
`
        )
        setAttributes(t2, classifier.colors[2], classifier.texts?.['2'])

        // Triangles for mixed classes
        const m12 = g.append('polygon').attr(
            'points',
            `
    ${w / 2},${(2 * h) / 3} ${(5 * w) / 6},${(2 * h) / 3} ${(2 * w) / 3},${h / 3}
`
        )
        setAttributes(m12, classifier.mixColors[0], classifier.texts?.['m12'])

        const m02 = g.append('polygon').attr(
            'points',
            `
    ${w / 2},${(2 * h) / 3} ${w / 3},${h} ${(2 * w) / 3},${h}
`
        )
        setAttributes(m02, classifier.mixColors[1], classifier.texts?.['m02'])

        const m01 = g.append('polygon').attr(
            'points',
            `
    ${w / 2},${(2 * h) / 3} ${w / 6},${(2 * h) / 3} ${w / 3},${h / 3}
`
        )
        setAttributes(m01, classifier.mixColors[2], classifier.texts?.['m01'])

        // Optional center (balanced class)
        if (classifier.centerCoefficient) {
            const center = g
                .append('circle')
                .attr('cx', w / 2)
                .attr('cy', (2 * h) / 3)
                .attr('r', (classifier.centerCoefficient * h) / 3)
            setAttributes(center, classifier.centerColor, classifier.texts?.['center'])
        }
    }

    return out
}
