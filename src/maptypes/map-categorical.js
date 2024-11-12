import { select } from 'd3-selection'
import { scaleOrdinal } from 'd3-scale'
import { schemeSet3 } from 'd3-scale-chromatic'
import * as smap from '../core/stat-map'
import * as lgct from '../legend/legend-categorical'

/**
 * Returns a categorical map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = smap.statMap(config)

    /** Fill style for each category/class. Ex.: { urb: "#fdb462", int: "#ffffb3", rur: "#ccebc5" } */
    out.classToFillStyle_ = undefined
    /** Text label for each category/class. Ex.: { "urb": "Urban", "int": "Intermediate", "rur": "Rural" } */
    out.classToText_ = undefined
    //specific tooltip text function
    out.tooltip_.textFunction = tooltipTextFunCat

    //the classifier: a function which returns a class number from a stat value.
    out.classifier_ = undefined

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;['classToFillStyle_', 'classToText_', 'noDataFillStyle_', 'tooltipText_', 'classifier_'].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config)
        ['classToFillStyle', 'classToText', 'noDataFillStyle', 'tooltipText', 'classifier'].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

    //@override
    out.updateClassification = function () {
        //get domain (unique values)
        const domain = out.statData().getUniqueValues()

        //get range [0,1,2,3,...,domain.length-1]
        const range = [...Array(domain.length).keys()]

        //make classifier
        out.classifier(scaleOrdinal().domain(domain).range(range))

        //assign class to nuts regions, based on their value
        out.svg()
            .selectAll('path.nutsrg')
            .attr('ecl', function (rg) {
                const sv = out.statData().get(rg.properties.id)
                if (!sv) return 'nd'
                const v = sv.value
                if (v != 0 && !v) return 'nd'
                return +out.classifier()(isNaN(v) ? v : +v)
            })

        return out
    }

    //@override
    out.updateStyle = function () {
        //if no color specified, use some default colors
        if (!out.classToFillStyle()) {
            const ctfs = {}
            const dom = out.classifier().domain()
            for (let i = 0; i < dom.length; i++) ctfs[dom[i]] = schemeSet3[i % 12]
            out.classToFillStyle(ctfs)
        }

        //apply style to nuts regions depending on class
        let selector = out.geo_ == 'WORLD' ? 'path.worldrg' : 'path.nutsrg'
        let regions = out.svg().selectAll(selector)
        regions
            .transition()
            .duration(out.transitionDuration())
            .attr('fill', function () {
                const ecl = select(this).attr('ecl')
                if (!ecl || ecl === 'nd') return out.noDataFillStyle_ || 'gray'
                return out.classToFillStyle_[out.classifier().domain()[ecl]] || out.noDataFillStyle_ || 'gray'
            })
            // apply mouseover event
            .end()
            .then(
                () => {
                    regions
                        .on('mouseover', function (e, rg) {
                            if (out.countriesToShow_ && out.geo_ !== 'WORLD') {
                                if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                                    const sel = select(this)
                                    sel.attr('fill___', sel.attr('fill'))
                                    sel.attr('fill', out.nutsrgSelFillSty_)
                                    if (out._tooltip) {
                                        out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                                    }
                                }
                            } else {
                                const sel = select(this)
                                sel.attr('fill___', sel.attr('fill'))
                                sel.attr('fill', out.nutsrgSelFillSty_)
                                if (out._tooltip) {
                                    out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
                                }
                            }
                        })
                        .on('mousemove', function (e, rg) {
                            if (out.countriesToShow_ && out.geo_ !== 'WORLD') {
                                if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                                    if (out._tooltip) out._tooltip.mousemove(e)
                                }
                            } else {
                                if (out._tooltip) out._tooltip.mousemove(e)
                            }
                        })
                        .on('mouseout', function () {
                            const sel = select(this)
                            let currentFill = sel.attr('fill')
                            let newFill = sel.attr('fill___')
                            if (newFill) {
                                sel.attr('fill', sel.attr('fill___'))
                                if (out._tooltip) out._tooltip.mouseout()
                            }
                        })
                },
                (err) => {
                    // rejection
                }
            )

        return out
    }

    //@override
    out.getLegendConstructor = function () {
        return lgct.legend
    }

    return out
}

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */
const tooltipTextFunCat = function (rg, map) {
    const buf = []
    if (rg.properties.id) {
        //name and code
        buf.push('<div class="estat-vis-tooltip-bar">' + rg.properties.na + ' (' + rg.properties.id + ') </div>')
    } else {
        //region name
        buf.push('<div class="estat-vis-tooltip-bar">' + rg.properties.na + '</div>')
    }
    //get stat value
    const sv = map.statData().get(rg.properties.id)
    //case when no data available
    if (!sv || (sv.value != 0 && !sv.value)) {
        buf.push(map.noDataText_)
        return buf.join('')
    }
    const val = sv.value
    if (map.classToText_) {
        const lbl = map.classToText_[val]
        //display label and value
        buf.push(`
    <div class="estat-vis-tooltip-text">
    <table class="nuts-table">
    <tbody>
    <tr>
    <td>
    ${lbl ? lbl : val}
    </td>
    </tr>
    </tbody>
    </table>
    </div>
`)
        return buf.join('')
    }
    //display just value
    buf.push(`
    <div class="estat-vis-tooltip-text">
    <table class="nuts-table">
    <tbody>
    <tr>
    <td>
    ${val}
    </td>
    </tr>
    </tbody>
    </table>
    </div>
`)
    return buf.join('')
}
