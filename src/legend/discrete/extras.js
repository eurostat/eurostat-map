// "No data" and extra categorical swatches that sit next to the class swatches of a discrete colour legend
import { toCategoryEcl } from '../../core/utils'
import { swatchStackLayout } from '../legend-swatch'

/**
 * The extra single-swatch rows of a discrete legend, in drawing order: the "no data" box, then one row per extra
 * categorical class mixed into the classification (`out.layer.categoryFillStyle_` / `categoryText_`, e.g. IMAGE's
 * "edit classification" categories). `draw(container)` fills a row's group.
 *
 * @param {Object} out legend instance
 * @param {Object} config legend config (noData, noDataText)
 * @param {{includeNoData?: boolean}} [opts] pass includeNoData: false for categories only
 * @returns {Array<{className:string, draw:(container:Object)=>void}>}
 */
export function extraSwatchRows(out, config, { includeNoData = true } = {}) {
    const highlightFunction = out.getHighlightFunction(out.map)
    const unhighlightFunction = out.getUnHighlightFunction(out.map)
    const rows = []
    if (includeNoData && config.noData) {
        rows.push({
            className: 'em-no-data-legend',
            draw: (c) => out.appendNoDataLegend(c, config.noDataText, highlightFunction, unhighlightFunction),
        })
    }
    const fills = out.layer?.categoryFillStyle_
    if (fills) {
        const texts = out.layer.categoryText_
        Object.keys(fills).forEach((raw) =>
            rows.push({
                className: 'em-category-legend',
                draw: (c) =>
                    out.appendCategoryLegend(c, toCategoryEcl(raw), fills[raw], (texts && texts[raw]) || raw, highlightFunction, unhighlightFunction),
            })
        )
    }
    return rows
}

/**
 * Stack extra rows vertically from startY into out._discreteLegendContainer. Row spacing comes from the same
 * layout helper as the class swatches (each row is one no-data-sized swatch plus its padding).
 */
export function appendExtraSwatchStack(out, rows, startY) {
    const stack = swatchStackLayout({ count: rows.length, shapeHeight: out.noDataShapeHeight, gap: out.noDataPadding, startY })
    rows.forEach((row, i) => {
        row.draw(out._discreteLegendContainer.append('g').attr('class', row.className).attr('transform', `translate(0,${stack.rowY(i)})`))
    })
}

/** Lay the extra rows out side by side to the right of a horizontal bar, `startX` from the left. */
export function appendExtraSwatchRow(out, rows, startX, y, gap = 16) {
    let x = startX
    rows.forEach((row) => {
        const container = out._discreteLegendContainer.append('g').attr('class', row.className).attr('transform', `translate(${x},${y})`)
        row.draw(container)
        x += container.node().getBBox().width + gap
    })
}
