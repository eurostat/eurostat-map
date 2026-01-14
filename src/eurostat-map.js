import * as Choropleth from './map-types/choropleth/map-choropleth'
import * as ProportionalSymbol from './map-types/proportional-symbol/map-proportional-symbols'
import * as Categorical from './map-types/map-categorical'
import * as BivariateChoropleth from './map-types/choropleth/map-choropleth-bivariate'
import * as TrivariateChoropleth from './map-types/choropleth/map-choropleth-trivariate'
import * as StripeComposition from './map-types/map-stripe-composition'
import * as PieCharts from './map-types/map-piecharts'
import * as Sparklines from './map-types/map-sparklines'
import * as FlowMap from './map-types/flow/map-flow'
import * as Coxcomb from './map-types/map-coxcomb'
import * as ValueByAlpha from './map-types/choropleth/map-value-by-alpha'
import * as mt from './core/stat-map'
import { DEFAULTLABELS } from './core/labels'

/**
 * Function returning a eurostat-map object.
 *
 * @param {*} type The type of map ('ch' for choropleth, etc.)
 * @param {*} config The configuration object. Ex.: { title: "Map title", geoCenter: [233,654], ...}
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
        if (type == 'trivariateChoropleth' || type == 'ternary') return TrivariateChoropleth.map(config)
        //stripes composition
        if (type == 'stripeComposition' || type == 'scomp') return StripeComposition.map(config)
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

        //add new map types here
        //if(type == "XX") return mapXX.map(config);

        console.log('Unexpected map type: ' + type)
        return mt.statMap(config, true, type)
    } catch (e) {
        console.error('Error in eurostat-map.map: ' + e.message)
        console.error(e)
    }
}

/**
 * Return a function which builds fill patterns style.
 * The returned function has for arguments the SVG element where to use the fill pattern, and the number of classes.
 *
 * @param {*} opts Various parameters on the fill pattern.
 * @returns {function}
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

import { version as pkgVersion } from '../package.json'
export const version = pkgVersion
