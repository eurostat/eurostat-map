import { select } from 'd3-selection'
import { scaleQuantile } from 'd3-scale'
import { interpolateRgb } from 'd3-interpolate'
import * as smap from '../core/stat-map'
import * as lgchbi from '../legend/legend-choropleth-bivariate'

/**
 * Return a bivariate choropleth map.
 * See: https://gistbok.ucgis.org/bok-topics/multivariate-mapping
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = smap.statMap(config)

    //number of classes for the classification. Same for both variables.
    out.clnb_ = 3
    //stevens.greenblue
    //TODO make it possible to use diverging color ramps ?
    out.startColor_ = '#e8e8e8'
    out.color1_ = '#73ae80'
    out.color2_ = '#6c83b5'
    out.endColor_ = '#2a5a5b'
    //a function returning the colors for the classes i,j
    out.classToFillStyle_ = undefined

    //style for no data regions
    out.noDataFillStyle_ = 'lightgray'
    //the classifier: a function which return a class number from a stat value.
    out.classifier1_ = undefined
    out.classifier2_ = undefined
    //specific tooltip text function
    out.tooltip_.textFunction = tooltipTextFunBiv

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    ;[
        'clnb_',
        'startColor_',
        'color1_',
        'color2_',
        'endColor_',
        'classToFillStyle_',
        'noDataFillStyle_',
        'classifier1_',
        'classifier2_',
    ].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config)
        ['clnb', 'startColor', 'color1', 'color2', 'endColor', 'classToFillStyle', 'noDataFillStyle'].forEach(function (key) {
            if (config[key] != undefined) out[key](config[key])
        })

    //@override
    out.updateClassification = function () {
        //set classifiers
        const range = [...Array(out.clnb()).keys()]
        if (!out.classifier1_) out.classifier1(scaleQuantile().domain(out.statData('v1').getArray()).range(range))
        if (!out.classifier2_) out.classifier2(scaleQuantile().domain(out.statData('v2').getArray()).range(range))

        //assign class to nuts regions, based on their value
        if (out.svg()) {
            out.svg()
                .selectAll('path.nutsrg')
                .attr('ecl1', function (rg) {
                    if (!out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) return
                    const sv = out.statData('v1').get(rg.properties.id)
                    if (!sv) return 'nd'
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return +out.classifier1_(+v)
                })
                .attr('ecl2', function (rg) {
                    if (!out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) return
                    const sv = out.statData('v2').get(rg.properties.id)
                    if (!sv) return 'nd'
                    const v = sv.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return +out.classifier2_(+v)
                })
                .attr('nd', function (rg) {
                    if (!out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) return
                    const sv1 = out.statData('v1').get(rg.properties.id)
                    const sv2 = out.statData('v2').get(rg.properties.id)
                    if (!sv1 || !sv2) return 'nd'
                    let v = sv1.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    v = sv2.value
                    if ((v != 0 && !v) || v == ':') return 'nd'
                    return ''
                })

            //define bivariate scale
            if (!out.classToFillStyle()) {
                const scale = scaleBivariate(out.clnb(), out.startColor(), out.color1(), out.color2(), out.endColor())
                out.classToFillStyle(scale)
            }

            //when mixing NUTS, level 0 is separated from the rest (using class nutsrg0)
            if (out.nutsLvl_ == 'mixed') {
                out.svg()
                    .selectAll('path.nutsrg0')
                    .attr('ecl1', function (rg) {
                        const sv = out.statData('v2').get(rg.properties.id)
                        if (!sv) return 'nd'
                        const v = sv.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return +out.classifier1_(+v)
                    })
                    .attr('ecl2', function (rg) {
                        const sv = out.statData('v2').get(rg.properties.id)
                        if (!sv) return 'nd'
                        const v = sv.value
                        if ((v != 0 && !v) || v == ':') return 'nd'
                        return +out.classifier2_(+v)
                    })
            }
        }
        return out
    }

    //@override
    out.updateStyle = function () {
        //apply style to nuts regions depending on classes
        if (out.svg()) {
            out.svg()
                .selectAll('path.nutsrg')
                .transition()
                .duration(out.transitionDuration())
                .attr('fill', function (rg) {
                    // only apply data-driven colour to included countries for NUTS templates
                    if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                        const ecl1 = select(this).attr('ecl1')
                        if (!ecl1) return // GISCO-2678 - lack of data no longer means no data, instead it is explicitly set using ':'.
                        if (ecl1 === 'nd') return out.noDataFillStyle() || 'gray'
                        const ecl2 = select(this).attr('ecl2')
                        if (!ecl2) return // GISCO-2678 - lack of data no longer means no data, instead it is explicitly set using ':'.
                        if (ecl2 === 'nd') return out.noDataFillStyle() || 'gray'
                        return out.classToFillStyle()(+ecl1, +ecl2)
                    } else {
                        return out.nutsrgFillStyle_
                    }
                })

            // set region hover function
            let selector = out.geo_ == 'WORLD' ? 'path.worldrg' : 'path.nutsrg'
            let regions = out.svg().selectAll(selector)
            regions
                .on('mouseover', function (e, rg) {
                    if (out.countriesToShow_) {
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
                .on('mousemove', function (rg) {
                    if (out.countriesToShow_) {
                        if (out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) {
                            if (out._tooltip) out._tooltip.mousemove()
                        }
                    } else {
                        if (out._tooltip) out._tooltip.mousemove()
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

            if (out.nutsLvl_ == 'mixed') {
                // Toggle visibility - only show NUTS 1,2,3 with stat values when mixing different NUTS levels
                out.svg()
                    .selectAll('path.nutsrg')
                    .style('display', function (rg) {
                        const ecl1 = select(this).attr('ecl1')
                        const ecl2 = select(this).attr('ecl2')
                        const lvl = select(this).attr('lvl')
                        // always display NUTS 0 for mixed, and filter countries to show
                        if (
                            (ecl1 && ecl2 && out.countriesToShow_.includes(rg.properties.id[0] + rg.properties.id[1])) ||
                            lvl == '0'
                        ) {
                            return 'block'
                        } else {
                            // dont show unclassified regions
                            return 'none'
                        }
                    })

                    //toggle stroke - similar concept to display attr (only show borders of NUTS regions that are classified (as data or no data) - a la IMAGE)
                    .style('stroke', function (bn) {
                        const lvl = select(this).attr('lvl')
                        const ecl1 = select(this).attr('ecl1')
                        const ecl2 = select(this).attr('ecl2')
                        if (ecl1 && ecl2 && lvl !== '0') {
                            return out.nutsbnStroke_[parseInt(lvl)] || '#777'
                        }
                    })
                    .style('stroke-width', function (rg) {
                        const lvl = select(this).attr('lvl')
                        const ecl1 = select(this).attr('ecl1')
                        const ecl2 = select(this).attr('ecl2')
                        if (ecl1 && ecl2 && lvl !== '0') {
                            return out.nutsbnStrokeWidth_[parseInt(lvl)] || 0.2
                        }
                    })
            }
        }
        return out
    }

    //@override
    out.getLegendConstructor = function () {
        return lgchbi.legend
    }

    return out
}

const scaleBivariate = function (clnb, startColor, color1, color2, endColor) {
    //color ramps, by row
    const cs = []
    //interpolate from first and last columns
    const rampS1 = interpolateRgb(startColor, color1)
    const ramp2E = interpolateRgb(color2, endColor)
    for (let i = 0; i < clnb; i++) {
        const t = i / (clnb - 1)
        const colFun = interpolateRgb(rampS1(t), ramp2E(t))
        const row = []
        for (let j = 0; j < clnb; j++) row.push(colFun(j / (clnb - 1)))
        cs.push(row)
    }
    //TODO compute other matrix based on rows, and average both?

    return function (ecl1, ecl2) {
        return cs[ecl1][ecl2]
    }
}

/**
 * Specific function for tooltip text.
 *
 * @param {*} rg The region to show information on.
 * @param {*} map The map element
 */
const tooltipTextFunBiv = function (rg, map) {
    const buf = []
    //region name
    if (rg.properties.id) {
        //name and code
        buf.push('<b>' + rg.properties.na + '</b> (' + rg.properties.id + ') <br>')
    } else {
        //region name
        buf.push('<b>' + rg.properties.na + '</b><br>')
    }

    //stat 1 value
    const sv1 = map.statData('v1').get(rg.properties.id)
    if (!sv1 || (sv1.value != 0 && !sv1.value)) buf.push(map.noDataText_)
    else {
        buf.push(sv1.value)
        //unit 1
        const unit1 = map.statData('v1').unitText()
        if (unit1) buf.push(' ' + unit1)
    }

    buf.push('<br>')

    //stat 2 value
    const sv2 = map.statData('v2').get(rg.properties.id)
    if (!sv2 || (sv2.value != 0 && !sv2.value)) buf.push(map.noDataText_)
    else {
        buf.push(sv2.value)
        //unit 2
        const unit2 = map.statData('v2').unitText()
        if (unit2) buf.push(' ' + unit2)
    }

    return buf.join('')
}
