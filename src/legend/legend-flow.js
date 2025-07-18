import * as Legend from './legend'

/**
 * A legend for proportional symbol map
 *
 * @param {*} map
 */
export const legend = function (map, config) {
    //build generic legend object for the map
    const out = Legend.legend(map)

    //override attribute values with config values
    if (config)
        for (let key in config) {
            if (key == 'colorLegend' || key == 'sizeLegend') {
                for (let p in out[key]) {
                    //override each property in size and color legend configs
                    if (config[key][p] !== undefined) {
                        out[key][p] = config[key][p]
                    }
                }
                if (config.colorLegend == false) out.colorLegend = false
            } else {
                out[key] = config[key]
            }
        }

    //@override
    out.update = function () {
        out.updateConfig()
        out.updateContainer()

        const m = out.map
        const lgg = out.lgg

        // update legend parameters if necessary
        if (m.legend_)
            for (let key in m.legend_) {
                if (key == 'colorLegend' || key == 'sizeLegend') {
                    for (let p in out[key]) {
                        //override each property in size and color legend m.legend_
                        if (m.legend_[key][p] !== undefined) {
                            out[key][p] = m.legend_[key][p]
                        }
                    }
                } else {
                    out[key] = m.legend_[key]
                }
            }

        //remove previous content
        lgg.selectAll('*').remove()

        //draw legend background box
        out.makeBackgroundBox()

        //titles
        if (out.title) out.addTitle()
        if (out.subtitle) out.addSubtitle()

        // draw legend elements
        buildFlowLegend()

        //set legend box dimensions
        out.setBoxDimension()
    }

    /**
     * Builds a legend which illustrates the statistical values of different flow symbol sizes
     *
     * @param {*} map map instance
     * @param {*} container parent legend object from core/legend.js
     */
    function buildFlowLegend(m) {
        const x = 10
        const y = 10

        buildFlowWidthLegend(m, x, y)

        if (m.flowDonuts_) {
            const offset = 20
            buildCircleSizeLegend(m, x, y + offset)
        }
    }

    function buildFlowWidthLegend(m, x, y) {
        const container = out.lgg.append('g').attr('id', 'em-flow-width-legend').attr('class', 'em-flow-width-legend')
        // Draw title
        container.append('text').attr('x', x).attr('y', y).text(out.title).attr('class', 'em-legend-label').attr('id', 'line-width-legend-title')
    }

    function buildCircleSizeLegend(m, x, y) {
        const container = out.lgg.append('g').attr('id', 'em-flow-circle-size-legend').attr('class', 'em-flow-circle-size-legend')
    }

    return out
}
