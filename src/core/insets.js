import { select } from 'd3-selection'
import { mapTemplate } from './map-template'

/**
 * Build inset maps for a map template
 */
export const buildInsets = function (out, withCenterPoints, mapType) {
    if (!out.insetBoxPosition_) {
        out.insetBoxPosition_ = [out.width_ - out.insetBoxWidth_ - 2 * out.insetBoxPadding_, 2 * out.insetBoxPadding_]
    }

    // add container to drawing group
    let svg = select('#' + out.svgId_)
    let drawingGroup = svg.select('#em-drawing-' + out.svgId_)

    // Check if insets group already exists (e.g., user-defined in Angular template)
    let insetsGroup = drawingGroup.select('#em-insets-group')
    if (insetsGroup.empty()) {
        insetsGroup = drawingGroup
            .append('g')
            .attr('id', 'em-insets-group')
            .attr('class', 'em-insets')
            .attr('transform', 'translate(' + out.insetBoxPosition_[0] + ',' + out.insetBoxPosition_[1] + ')')
    }

    if (out.insets_ === 'default') {
        //if needed, use default inset config
        out.insets_ = defaultInsetConfig(out.insetBoxWidth_, out.insetBoxPadding_)
    }

    // append each inset to map
    for (let i = 0; i < out.insets_.length; i++) {
        const config = out.insets_[i]
        config.svgId = config.svgId || 'inset' + config.geo + Math.random().toString(36).substring(7)

        // Look for existing element with this ID
        let existingElement = select('#' + config.svgId)

        if (existingElement.size() == 0) {
            // No element exists - create the full structure
            const x = config.x == undefined ? out.insetBoxPadding_ : config.x
            const y = config.y == undefined ? out.insetBoxPadding_ + i * (out.insetBoxPadding_ + out.insetBoxWidth_) : config.y
            const ggeo = insetsGroup
                .append('g')
                .attr('id', 'em-inset-' + config.svgId)
                .attr('class', 'em-inset')
                .attr('transform', 'translate(' + x + ',' + y + ')')
            ggeo.append('svg').attr('id', config.svgId)
        } else {
            // Element exists - check what type it is
            const tagName = existingElement.node().tagName.toLowerCase()

            if (tagName === 'g') {
                // It's a <g> element - append an <svg> inside it for eurostat-map to use
                const innerSvgId = config.svgId + '-svg'
                let innerSvg = existingElement.select('#' + innerSvgId)

                if (innerSvg.empty()) {
                    // Create inner SVG
                    existingElement
                        .append('svg')
                        .attr('id', innerSvgId)
                        .attr('class', 'em-inset-svg')
                        .attr('width', config.width || out.insetBoxWidth_)
                        .attr('height', config.height || out.insetBoxWidth_)
                        .attr('overflow', 'hidden')
                }

                // Update config to point to the inner SVG
                config._originalSvgId = config.svgId // Keep reference to wrapper
                config.svgId = innerSvgId
            }
            // If it's already an <svg>, use it as-is (existing behavior)
        }

        // build inset
        // GISCO-2676 - PT azores inset has 2 insets with the same Geo, so second was overriding first:
        if (out.insetTemplates_[config.geo]) {
            //if inset already exists in map with same geo, then push both to an array
            let inset = buildInset(config, out, withCenterPoints, mapType)
            inset.buildMapTemplateBase()
            out.insetTemplates_[config.geo] = [out.insetTemplates_[config.geo], inset]
        } else {
            let inset = buildInset(config, out, withCenterPoints, mapType)
            let drawnInset = inset.buildMapTemplateBase()
            out.insetTemplates_[config.geo] = drawnInset
        }
    }

    return out
}

/** Build template for inset, based on main one */
const buildInset = function (config, out, withCenterPoints, mapType) {
    const mt = mapTemplate(config, withCenterPoints, mapType)

    //define default values for inset configs
    config = config || {}
    config.proj = config.proj || _defaultCRS[config.geo]
    config.scale = config.scale || out.insetScale_
    config.footnote = config.footnote || ''
    config.showSourceLink = config.showSourceLink || false
    config.zoomExtent = config.zoomExtent || out.insetZoomExtent_
    config.width = config.width || out.insetBoxWidth_
    config.height = config.height || out.insetBoxWidth_
    config.insets = config.insets || []
    config.insetTemplates = config.insetTemplates || {}
    config.callback = config.callback || undefined

    //copy main map attributes
    ;[
        'nutsLevel_',
        'nutsYear_',
        'hoverColor_',
        //'nutsbnStroke_', // DEPRECATED
        // 'nutsbnStrokeWidth_', // DEPRECATED
        'cntrgFillStyle_', // DEPRECATED
        'cntbnStroke_', // DEPRECATED
        'cntbnStrokeWidth_', // DEPRECATED
        'seaFillStyle_', // DEPRECATED
        'drawCoastalMargin_',
        'coastalMarginColor_', // DEPRECATED
        'coastalMarginWidth_', // DEPRECATED
        'coastalMarginStdDev_',
        'graticuleStroke_', // DEPRECATED
        'graticuleStrokeWidth_', // DEPRECATED
        'lg_',
        'projectionFunction_',
        'filterGeometriesFunction_',
        'processCentroids_',
    ].forEach(function (att) {
        mt[att] = out[att]
    })

    //copy stat map attributes/methods
    ;['stat', 'statData', 'legend', 'legendObj', 'noDataText', 'language', 'transitionDuration', 'tooltip_', 'classToText_'].forEach(function (att) {
        mt[att] = out[att]
    })

    //apply config values for inset
    for (let key in config) mt[key + '_'] = config[key]

    mt.isInset = true // flag for inset-specific settings e.g. CSS class for titles
    return mt
}

/**
 * Remove insets maps from the DOM
 */
export const removeInsets = function (out) {
    if (out.insetTemplates_) {
        for (let template in out.insetTemplates_) {
            const insetTemplate = out.insetTemplates_[template]

            // Handle array of insets (GISCO-2676 case)
            if (Array.isArray(insetTemplate)) {
                insetTemplate.forEach((t) => clearInsetSvg(t))
            } else {
                clearInsetSvg(insetTemplate)
            }
        }
        out.insetTemplates_ = {}
    }
}

/**
 * Clear the contents of an inset SVG without removing the wrapper
 */
const clearInsetSvg = function (insetTemplate) {
    if (!insetTemplate) return

    let id = insetTemplate.svgId_
    let existing = select('#' + id)

    if (existing.size() > 0) {
        existing.html('') // empty contents, but don't remove the element
    }
}

/**
 * Default inset setting.
 * @param {*} s The width of the inset box
 * @param {*} p The padding
 */
const defaultInsetConfig = function (s, p) {
    const out = [
        { geo: 'IC', x: 0, y: 0, width: s, height: 0.3 * s },
        { geo: 'CARIB', x: 0, y: 0.3 * s + p, width: 0.5 * s, height: s },
        { geo: 'GF', x: 0.5 * s, y: 0.3 * s + p, width: 0.5 * s, height: 0.75 * s },
        { geo: 'YT', x: 0.5 * s, y: 1.05 * s + p, width: 0.25 * s, height: 0.25 * s },
        { geo: 'RE', x: 0.75 * s, y: 1.05 * s + p, width: 0.25 * s, height: 0.25 * s },
        { geo: 'PT20', x: 0, y: 1.3 * s + 2 * p, width: 0.75 * s, height: 0.25 * s },
        { geo: 'PT30', x: 0.75 * s, y: 1.3 * s + 2 * p, width: 0.25 * s, height: 0.25 * s },
        { geo: 'MT', x: 0, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s },
        { geo: 'LI', x: 0.25 * s, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s },
        { geo: 'SJ_SV', x: 0.5 * s, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s },
        { geo: 'SJ_JM', x: 0.75 * s, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s },
    ]
    //hide graticule for insets
    for (let i = 0; i < out.length; i++) out[i].drawGraticule = false
    return out
}

/** Default CRS for each geo area */
const _defaultCRS = {
    EUR: '3035',
    IC: '32628',
    GP: '32620',
    MQ: '32620',
    GF: '32622',
    RE: '32740',
    YT: '32738',
    MT: '3035',
    PT20: '32626',
    PT30: '32628',
    LI: '3035',
    IS: '3035',
    SJ_SV: '3035',
    SJ_JM: '3035',
    CARIB: '32620',
    WORLD: '54030',
}
