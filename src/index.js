import './css/index.css'
import * as Choropleth from './map-types/choropleth/map-choropleth'
import * as ProportionalSymbol from './map-types/proportional-symbol/map-proportional-symbols'
import * as Categorical from './map-types/map-categorical'
import * as BivariateChoropleth from './map-types/choropleth/map-choropleth-bivariate'
import * as TrivariateChoropleth from './map-types/choropleth/map-choropleth-trivariate'
import * as FlowMap from './map-types/flow/map-flow'
import * as ValueByAlpha from './map-types/choropleth/map-value-by-alpha'
import * as Mushroom from './map-types/proportional-symbol/mushrooms/map-mushroom.js'

//composition maps
import * as PieCharts from './map-types/composition/map-pie'
import * as Sparklines from './map-types/composition/map-spark'
import * as Bar from './map-types/composition/map-bar.js'
import * as Waffle from './map-types/composition/map-waffle.js'
import * as Coxcomb from './map-types/composition/map-coxcomb.js'
import * as StripeComposition from './map-types/composition/map-stripe.js'

import * as mt from './core/stat-map'
import { DEFAULTLABELS } from './core/decoration/labels'

// set default d3 locale
import { formatDefaultLocale } from 'd3-format'
formatDefaultLocale({
    decimal: '.',
    thousands: ' ',
    grouping: [3],
    currency: ['', '€'],
})

// init proj4 with common projections and aliases
import { initProj4 } from './core/geo/proj4.js'
initProj4()

//types
/** @typedef {import('./types/core/MapInstance').MapInstance} MapInstance */
/** @typedef {import('./types/core/MapConfig').MapConfig} MapConfig */
/** @typedef {import('./types/map-types/MapType').MapType} MapType */

/**
 * Creates and returns a eurostat-map instance of the specified type.
 *
 * @param {MapType} type - The map type ('choropleth', 'ch', 'ps', 'flow', etc.)
 * @param {MapConfig} [config] - Optional initial configuration object.
 * @returns {MapInstance}
 *
 * @example
 * eurostatmap.map('choropleth')
 *   .width(800)
 *   .stat({ eurostatDatasetCode: 'demo_r_d3dens', filters: { TIME: '2024' } })
 *   .build()
 */
export const map = function (type, config) {
    try {
        //choropleth map
        if (type == 'choropleth' || type == 'ch') return Choropleth.map(config)
        //categorical map
        if (type == 'categorical' || type == 'ct') return Categorical.map(config)
        //proportionnal symbols map
        if (type == 'proportionalSymbol' || type == 'proportionalSymbols' || type == 'ps') return ProportionalSymbol.map(config)
        //bivariate choropleth
        if (type == 'bivariateChoropleth' || type == 'chbi') return BivariateChoropleth.map(config)
        //trivariate choropleth
        if (type == 'trivariateChoropleth' || type == 'ternary' || type == 'chtri') return TrivariateChoropleth.map(config)
        //stripes composition
        if (type == 'stripeComposition' || type == 'scomp' || type == 'stripe') return StripeComposition.map(config)
        //proportional pie charts
        if (type == 'pieChart' || type == 'pie') return PieCharts.map(config)
        //sparkline maps
        if (type == 'sparkline' || type == 'spark' || type == 'sparklines') return Sparklines.map(config)
        //flow maps
        if (type == 'flow' || type == 'flowmap') return FlowMap.map(config)
        //coxcomb maps
        if (type == 'coxcomb' || type == 'polar') return Coxcomb.map(config)
        //value by alpha maps
        if (type == 'alpha' || type == 'valueByAlpha') return ValueByAlpha.map(config)
        //mushroom (Cheysson )
        if (type == 'mushroom') return Mushroom.map(config)
        //waffle (Cheysson )
        if (type == 'waffle') return Waffle.map(config)
        //bar composition
        if (type == 'bar' || type == 'barComposition') return Bar.map(config)

        //add new map types here
        //if(type == "XX") return mapXX.map(config);

        console.warn(`[eurostat-map] Unknown map type: "${type}". See documentation for supported types.`)
        return mt.statMap(config, true, type)
    } catch (e) {
        console.error('Error in eurostat-map.map: ' + e.message)
        console.error(e)
    }
}

/** @typedef {import('./types/utils/FillPatternOptions').FillPatternOptions} FillPatternOptions */

/**
 * Returns a function that defines SVG fill patterns for use in map legends.
 * The returned function accepts (svg, numberOfClasses) as arguments.
 *
 * @param {FillPatternOptions} [opts]
 * @returns {function(svg: any, numberOfClasses: number): void}
 */
export const getFillPatternDefinitionFunction = function (opts) {
    opts = opts || {}
    opts.shape = opts.shape || 'circle'
    const ps = opts.patternSize || 5
    const smin = opts.minSize || 1
    const smax = opts.maxSize || 5.5
    opts.bckColor = opts.bckColor || 'white'
    opts.symbColor = opts.symbColor || 'black'
    return function (svg, numberOfClasses) {
        //clear previous
        svg.selectAll('.em-fill-pattern').remove()
        for (let i = 0; i < numberOfClasses; i++) {
            const si = smin + ((smax - smin) * i) / (numberOfClasses - 1)
            const patt = svg
                .append('pattern')
                .attr('class', 'em-fill-pattern')
                .attr('id', 'pattern_' + i)
                .attr('x', '0')
                .attr('y', '0')
                .attr('width', ps)
                .attr('height', ps)
                .attr('patternUnits', 'userSpaceOnUse')
            patt.append('rect').attr('x', 0).attr('y', 0).attr('width', ps).attr('height', ps).style('stroke', 'none').style('fill', opts.bckColor)
            if (opts.shape == 'square')
                patt.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', si)
                    .attr('height', si)
                    .style('stroke', 'none')
                    .style('fill', opts.symbColor)
            else
                patt.append('circle')
                    .attr('cx', ps * 0.5)
                    .attr('cy', ps * 0.5)
                    .attr('r', si * 0.5)
                    .style('stroke', 'none')
                    .style('fill', opts.symbColor)
        }
    }
}

//support deprecated name
export const getFillPatternDefinitionFun = getFillPatternDefinitionFunction

export const getDefaultLabels = function () {
    return DEFAULTLABELS
}

export { projectFromMap, projectToMap } from './core/geo/proj4.js'

import pkg from '../package.json'
export const version = pkg.version
