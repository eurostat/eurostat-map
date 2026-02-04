import { select } from 'd3-selection'
import { arc, pie } from 'd3-shape'
import { schemeCategory10 } from 'd3-scale-chromatic'
//schemeSet3 schemeDark2 schemePastel1 schemeTableau10
import * as StatMap from '../core/stat-map'
import * as StripeCompositionLegend from '../legend/legend-stripe-composition'
import { getRegionsSelector } from '../core/utils'
/**
 * Return a stripe composition map.
 *
 * @param {*} config
 */
export const map = function (config) {
    //create map object to return, using the template
    const out = StatMap.statMap(config, false, 'scomp')

    //width of the stripes serie
    out.stripeWidth_ = 50
    //orientation - vertical by default
    out.stripeOrientation_ = 0

    //colors - indexed by category code
    out.catColors_ = undefined
    //labels - indexed by category code
    out.catLabels_ = undefined

    //show stripes only when data for all categories is complete.
    //Otherwise, consider the regions as being with no data at all.
    out.showOnlyWhenComplete_ = false

    //tooltip pie chart
    out.pieChartRadius_ = 40
    out.pieChartInnerRadius_ = 15

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    const paramNames = [
        'stripeWidth_',
        'stripeOrientation_',
        'catColors_',
        'catLabels_',
        'showOnlyWhenComplete_',
        'noDataFillStyle_',
        'pieChartRadius_',
        'pieChartInnerRadius_',
    ]
    paramNames.forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    })

    //override attribute values with config values
    if (config) {
        paramNames.forEach(function (key) {
            let k = key.slice(0, -1) // remove trailing underscore
            if (config[k] != undefined) out[k](config[k])
        })
    }

    /**
     * A function to define a stripe composition map easily, without repetition of information.
     * Only for eurobase data sources.
     *
     * @param {Object} config Configuration object with the following properties:
     * @param {String} config.eurostatDatasetCode - The Eurostat dataset code
     * @param {Object} [config.filters] - Filters for the Eurostat API query
     * @param {String} [config.unitText] - Optional unit text for display
     * @param {String} config.categoryParameter - The dimension/parameter for the composition categories
     * @param {Array} config.categoryCodes - The category codes of the composition
     * @param {Array} [config.categoryLabels] - Optional labels for the category codes
     * @param {Array} [config.categoryColors] - Optional colors for the categories
     *
     * @example
     * .statComp({
     *     eurostatDatasetCode: 'demo_pjan',
     *     filters: { sex: 'T' },
     *     unitText: 'Population',
     *     categoryParameter: 'age',
     *     categoryCodes: ['Y_LT15', 'Y15-64', 'Y_GE65'],
     *     categoryLabels: ['Under 15', '15-64', '65+'],
     *     categoryColors: ['#4daf4a', '#377eb8', '#e41a1c'],
     * })
     */
    out.statComp = function (config, dim, codes, labels, colors) {
        // Backwards compatibility: handle old positional arguments API
        // Old API: statComp(stat, dim, codes, labels, colors)
        if (dim !== undefined && typeof dim === 'string') {
            config = {
                ...config,
                categoryParameter: dim,
                categoryCodes: codes,
                categoryLabels: labels,
                categoryColors: colors,
            }
        }

        // Backwards compatibility: flatten nested stat object if present
        if (config.stat) {
            config = {
                ...config.stat,
                ...config,
            }
            delete config.stat
        }

        const { eurostatDatasetCode, filters, unitText, categoryParameter, categoryCodes, categoryLabels, categoryColors } = config

        // Validate required parameters
        if (!eurostatDatasetCode) {
            console.error('statComp: eurostatDatasetCode is required')
            return out
        }
        if (!categoryParameter) {
            console.error('statComp: categoryParameter is required')
            return out
        }
        if (!categoryCodes || !categoryCodes.length) {
            console.error('statComp: categoryCodes array is required')
            return out
        }

        // Base filters (clone to avoid mutation)
        const baseFilters = filters ? { ...filters } : {}

        // Add one dataset config for each category code
        for (let i = 0; i < categoryCodes.length; i++) {
            const code = categoryCodes[i]

            // Build stat config for this category
            const statConfig = {
                eurostatDatasetCode,
                unitText,
                filters: {
                    ...baseFilters,
                    [categoryParameter]: code,
                },
            }

            // Register the stat
            out.stat(code, statConfig)

            // Assign color if specified
            if (categoryColors && categoryColors[i]) {
                out.catColors_ = out.catColors_ || {}
                out.catColors_[code] = categoryColors[i]
            }

            // Assign label if specified
            if (categoryLabels && categoryLabels[i]) {
                out.catLabels_ = out.catLabels_ || {}
                out.catLabels_[code] = categoryLabels[i]
            }
        }

        // Set statCodes
        statCodes = categoryCodes

        return out
    }

    /** The codes of the categories to consider for the composition. */
    let statCodes = undefined

    /**
     * Function to compute composition for region id, for each category.
     * Return an object with, for each category, the share [0,1] of the category.
     * @param {*} id
     */
    const getComposition = function (id) {
        let comp = {},
            sum = 0
        //get stat value for each category. Compute the sum.
        for (let i = 0; i < statCodes.length; i++) {
            //retrieve code and stat value
            const sc = statCodes[i]
            const s = out.statData(sc).get(id)

            //case when some data is missing
            if (!s || (s.value != 0 && !s.value) || isNaN(s.value)) {
                if (out.showOnlyWhenComplete()) return undefined
                else continue
            }

            comp[sc] = s.value
            sum += s.value
        }

        //case when no data
        if (sum == 0) return undefined

        //compute ratios
        for (let i = 0; i < statCodes.length; i++) comp[statCodes[i]] /= sum

        return comp
    }

    //@override
    out.updateClassification = function () {
        //if not provided, get list of stat codes from the map stat data
        if (!statCodes) {
            //get list of stat codes.
            statCodes = Object.keys(out.statData_)
            //remove "default", if present
            const index = statCodes.indexOf('default')
            if (index > -1) statCodes.splice(index, 1)
        }

        return out
    }

    //@override
    out.updateStyle = function () {
        //if not specified, build default color ramp
        if (!out.catColors()) {
            out.catColors({})
            for (let i = 0; i < statCodes.length; i++) out.catColors()[statCodes[i]] = schemeCategory10[i % 10]
        }

        //if not specified, initialise category labels
        out.catLabels_ = out.catLabels_ || {}

        //build and assign texture to the regions
        out.svg()
            .selectAll(getRegionsSelector(out))
            .style('fill', function (d) {
                if (this.parentNode.classList.contains('em-cntrg')) return // Skip country regions
                const id = d.properties.id

                //compute composition
                const composition = getComposition(id)

                //case when no or missing data
                if (!composition) return out.noDataFillStyle() || 'gray'

                //make stripe pattern
                const patt = out
                    .svg()
                    .append('pattern')
                    .attr('id', 'pattern_' + id)
                    .attr('x', '0')
                    .attr('y', '0')
                    .attr('width', out.stripeWidth())
                    .attr('height', 1)
                    .attr('patternUnits', 'userSpaceOnUse')
                //use orientation, if specified
                if (out.stripeOrientation()) patt.attr('patternTransform', 'rotate(' + out.stripeOrientation() + ')')

                //background
                patt.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', out.stripeWidth())
                    .attr('height', 1)
                    .style('stroke', 'none')
                    .style('fill', 'lightgray')

                //make stripes, one per category
                let x = 0
                for (let code in composition) {
                    //get stripe size
                    let dx = composition[code]
                    if (!dx) continue
                    dx *= out.stripeWidth()

                    //get stripe color
                    const col = out.catColors()[code] || 'lightgray'

                    //add stripe to pattern: a thin rectangle
                    patt.append('rect')
                        .attr('x', x)
                        .attr('y', 0)
                        .attr('height', 1)
                        .style('stroke', 'none')
                        .attr('code', code)
                        .style('fill', col)
                        //transition along x
                        .style('pointer-events', 'none') // disable interaction during transition
                        .transition()
                        .duration(out.transitionDuration())
                        .on('end', function () {
                            // Re-enable after animation completes
                            select(this).style('pointer-events', null)
                        })
                        .attr('width', dx)
                    x += dx
                }

                //return pattern reference
                return 'url(#pattern_' + id + ')'
            })
            .attr('nd', function (d) {
                return !getComposition(d.properties.id) ? 'nd' : ''
            })

        // set region hover function
        const selector = getRegionsSelector(out)
        let regions = out.svg().selectAll(selector)
        regions
            .on('mouseover', function (e, rg) {
                const sel = select(this)
                sel.attr('fill___', sel.style('fill'))
                sel.style('fill', out.hoverColor_)
                if (out._tooltip) out._tooltip.mouseover(out.tooltip_.textFunction(rg, out))
            })
            .on('mousemove', function (e, rg) {
                if (out._tooltip) out._tooltip.mousemove(e)
            })
            .on('mouseout', function () {
                const sel = select(this)
                let currentFill = sel.style('fill')
                let newFill = sel.attr('fill___')
                if (newFill) {
                    sel.style('fill', sel.attr('fill___'))
                    if (out._tooltip) out._tooltip.mouseout()
                }
            })

        return out
    }

    //@override
    out.getLegendConstructor = function () {
        return StripeCompositionLegend.legend
    }

    //specific tooltip text function
    const tooltipTextFunctionStripeComposition = function (rg, map) {
        const regionName = rg.properties.na || rg.properties.name
        const regionId = rg.properties.id
        const comp = getComposition(regionId)
        const data = []

        for (const key in comp) data.push({ code: key, value: comp[key] })

        let html = ''
        // Header with region name and ID
        html += `<div class="em-tooltip-bar">
        <b>${regionName}</b>${regionId ? ` (${regionId})` : ''}
    </div>`

        if (!data || data.length === 0) {
            html += `<div>${out.noDataText()}</div>`
            return html
        }

        // Build pie chart as SVG string
        const r = out.pieChartRadius(),
            ir = out.pieChartInnerRadius()

        const pie_ = pie()
            .sort(null)
            .value((d) => d.value)
        const arcGen = arc().innerRadius(ir).outerRadius(r)

        const pieData = pie_(data)

        let paths = ''
        for (const d of pieData) {
            const fill = out.catColors()[d.data.code] || 'lightgray'
            const dPath = arcGen(d)
            paths += `<path d="${dPath}" fill="${fill}" stroke="darkgray"></path>`
        }

        const svg = `
        <div style="display: flex; justify-content: center;">
            <svg viewBox="${-r} ${-r} ${2 * r} ${2 * r}" width="${2 * r}">
                <g>${paths}</g>
            </svg>
        </div>
    `

        html += svg
        return html
    }
    //specific tooltip text function
    out.tooltip_.textFunction = tooltipTextFunctionStripeComposition

    return out
}
