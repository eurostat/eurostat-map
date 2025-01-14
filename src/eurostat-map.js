import * as Choropleth from './maptypes/map-choropleth'
import * as ProportionalSymbol from './maptypes/map-proportional-symbols'
import * as Categorical from './maptypes/map-categorical'
import * as BivariateChoropleth from './maptypes/map-choropleth-bivariate'
import * as TrivariateChoropleth from './maptypes/map-choropleth-trivariate'
import * as StripeComposition from './maptypes/map-stripe-composition'
import * as PieCharts from './maptypes/map-piecharts'
import * as Sparklines from './maptypes/map-sparklines'
import * as FlowMap from './maptypes/map-flow'
import * as mt from './core/stat-map'

/**
 * Function returning a eurostat-map object.
 *
 * @param {*} type The type of map ('ch' for choropleth, etc.)
 * @param {*} config The configuration object. Ex.: { title: "Map title", geoCenter: [233,654], ...}
 */
export const map = function (type, config) {
    //choropleth map
    if (type == 'choropleth' || type == 'ch') return Choropleth.map(config)
    //categorical map
    if (type == 'categorical' || type == 'ct') return Categorical.map(config)
    //proportionnal symbols map
    if (type == 'proportionalSymbol' || type == 'ps') return ProportionalSymbol.map(config)
    //bivariate choropleth
    if (type == 'bivariateChoropleth' || type == 'chbi') return BivariateChoropleth.map(config)
    //trivariate choropleth
    if (type == 'trivariateChoropleth' || type == 'chbi') return TrivariateChoropleth.map(config)
    //stripes composition
    if (type == 'stripeComposition' || type == 'scomp') return StripeComposition.map(config)
    //proportional pie charts
    if (type == 'pieChart' || type == 'pie') return PieCharts.map(config)
    //sparkline maps
    if (type == 'sparkline' || type == 'spark' || type == 'sparklines') return Sparklines.map(config)
    //flow maps
    if (type == 'flow' || type == 'flowmap') return FlowMap.map(config)
    //add new map types here
    //if(type == "XX") return mapXX.map(config);

    console.log('Unexpected map type: ' + type)
    return mt.statMap(config, true, type)
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
        svg.selectAll('.estatmapPattern').remove()
        for (let i = 0; i < numberOfClasses; i++) {
            const si = smin + ((smax - smin) * i) / (numberOfClasses - 1)
            const patt = svg
                .append('pattern')
                .attr('class', 'estatmapPattern')
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

export const getFillPatternDefinitionFun = function (opts) {
    console.warn('getFillPatternDefinitionFun is now DEPRECATED. Please use getFillPatternDefinitionFunction() instead.')
    return getFillPatternDefinitionFunction(opts)
}
