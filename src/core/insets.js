import { select } from 'd3-selection'
import { createMapInstance } from './map-instance'
import { getDefaultScalebarConfig } from './decoration/scalebar'
import { getButtonPadding, getButtonSize } from './buttons/button-utils'

//types
/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */

/**
 * Build inset maps for a map template
 * @param {MapInstance} out
 * @param {boolean} withCenterPoints
 * @param {string} mapType
 */
export const buildInsets = function (out, withCenterPoints, mapType) {
    // Early return if no insets to build
    if (!out.insets_ || out.insets_.length === 0) {
        return out
    }

    // On mobile, insets are hidden by default to save space (see the display:none below), and the
    // toggle button is auto-shown so they can still be revealed (see map-instance.js) unless the
    // user has explicitly configured insetsButton themselves.
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
    const showsInsetsButton = out.insetsButton_ || (!out._insetsButtonExplicit_ && isMobile)

    if (!out.insetBoxPosition_) {
        const buttonClearanceY = showsInsetsButton ? getButtonSize() + getButtonPadding() : 0
        out.insetBoxPosition_ = [out.width_ - out.insetBoxWidth_ - 2 * out.insetBoxPadding_, 2 * out.insetBoxPadding_ + buttonClearanceY]
    }

    let svg = select('#' + out.svgId_)
    let drawingGroup = svg.select('#em-drawing-' + out.svgId_)

    const insetsGroup = drawingGroup
        .append('g')
        .attr('id', 'em-insets-group')
        .attr('class', 'em-insets')
        .attr('transform', 'translate(' + out.insetBoxPosition_[0] + ',' + out.insetBoxPosition_[1] + ')')

    // Hidden by default on mobile to save space; the auto-shown insets button (or an explicitly
    // configured one) toggles this same display style, exactly as it already does on desktop.
    if (isMobile) {
        insetsGroup.style('display', 'none')
    }

    if (out.insets_ === 'default') {
        out.insets_ = defaultInsetConfig(out.insetBoxWidth_, out.insetBoxPadding_)
    }

    const previousInsetSvgIdsByGeo = out._lastInsetSvgIdsByGeo_ || {}
    const consumePreviousInsetSvgId = (geo) => {
        const previous = previousInsetSvgIdsByGeo[geo]
        if (!previous) return undefined
        if (Array.isArray(previous)) return previous.shift()
        delete previousInsetSvgIdsByGeo[geo]
        return previous
    }

    for (let i = 0; i < out.insets_.length; i++) {
        const config = out.insets_[i]
        const x = config.x == undefined ? out.insetBoxPadding_ : config.x
        const y = config.y == undefined ? out.insetBoxPadding_ + i * (out.insetBoxPadding_ + out.insetBoxWidth_) : config.y

        config.svgId = config.svgId || consumePreviousInsetSvgId(config.geo) || 'inset' + config.geo + Math.random().toString(36).substring(7)

        let svg = select('#' + config.svgId)

        if (svg.size() > 0) {
            // Ensure active inset containers are visible when reusing existing nodes.
            svg.style('display', null)

            const nodeName = (svg.node()?.nodeName || '').toLowerCase()

            // Custom inset containers can be pre-created as <g id="..."> outside
            // em-insets-group, so they require absolute positioning including box offset.
            if (nodeName === 'g') {
                svg.attr('transform', 'translate(' + (x + out.insetBoxPosition_[0]) + ', ' + (y + out.insetBoxPosition_[1]) + ')')
            } else {
                // Built-in inset wrappers are <g id="em-inset-..."><svg id="...">,
                // so positioning is relative to em-insets-group.
                const wrapper = select(svg.node()?.parentNode)
                if (!wrapper.empty() && wrapper.attr('id') === 'em-inset-' + config.svgId) {
                    wrapper.attr('transform', 'translate(' + x + ',' + y + ')')
                }
            }
        }

        if (svg.size() == 0) {
            const ggeo = insetsGroup
                .append('g')
                .attr('id', 'em-inset-' + config.svgId)
                .attr('class', 'em-inset')
                .attr('transform', 'translate(' + x + ',' + y + ')')
            ggeo.append('svg').attr('id', config.svgId)
        }

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
    //TODO find a better way to do that

    //copy map
    //for(let key__ in map) {
    //mt[key__] = map[key__];
    //}

    config.isInset = true
    const mt = createMapInstance(config, withCenterPoints, mapType)

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
    config.onBuild = config.onBuild || out.onBuild_

    // Inset configs often pass partial scalebar objects (e.g., just position/maxWidth).
    // Merge with defaults to avoid undefined numeric fields producing NaN SVG coordinates.
    if (config.scalebar === true) {
        config.scalebar = getDefaultScalebarConfig()
    } else if (config.scalebar && typeof config.scalebar === 'object') {
        config.scalebar = Object.assign({}, getDefaultScalebarConfig(), config.scalebar)
    }

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
    ;['stat', 'statData', 'legend', 'legendObj', 'noDataText', 'language', 'transitionDuration', 'tooltip_', '_tooltip', 'classToText_'].forEach(
        function (att) {
            mt[att] = out[att]
        }
    )

    //apply config values for inset
    for (let key in config) mt[key + '_'] = config[key]

    // Only set these defaults if not explicitly provided in the inset config
    if (config.zoomButtons === undefined) mt.zoomButtons_ = false
    if (config.insetsButton === undefined) mt.insetsButton_ = false
    if (config.showScalebar === undefined) mt.showScalebar_ = false
    if (config.minimap === undefined) mt.minimap_ = undefined

    return mt
}

/**
 * Remove insets maps from the DOM
 */
export const removeInsets = function (out) {
    if (out.insetTemplates_) {
        out._lastInsetSvgIdsByGeo_ = {}

        const clearInset = (entry) => {
            if (!entry) return
            if (Array.isArray(entry)) {
                entry.forEach(clearInset)
                return
            }
            const id = entry.svgId_
            if (!id) return

            const geo = entry.geo_
            if (geo) {
                const current = out._lastInsetSvgIdsByGeo_[geo]
                if (!current) {
                    out._lastInsetSvgIdsByGeo_[geo] = id
                } else if (Array.isArray(current)) {
                    current.push(id)
                } else {
                    out._lastInsetSvgIdsByGeo_[geo] = [current, id]
                }
            }

            const existing = select('#' + id)
            if (!existing.empty()) {
                existing.html('') // empty them, but dont remove them.
                // Hide stale custom inset placeholders; active ones are unhidden when reused.
                existing.style('display', 'none')
            }
        }

        for (let template in out.insetTemplates_) {
            clearInset(out.insetTemplates_[template])
        }
        out.insetTemplates_ = {} //  GISCO-2676
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
        {
            geo: 'YT',
            x: 0.5 * s,
            y: 1.05 * s + p,
            width: 0.25 * s,
            height: 0.25 * s,
        },
        {
            geo: 'RE',
            x: 0.75 * s,
            y: 1.05 * s + p,
            width: 0.25 * s,
            height: 0.25 * s,
        },
        {
            geo: 'PT20',
            x: 0,
            y: 1.3 * s + 2 * p,
            width: 0.75 * s,
            height: 0.25 * s,
        },
        {
            geo: 'PT30',
            x: 0.75 * s,
            y: 1.3 * s + 2 * p,
            width: 0.25 * s,
            height: 0.25 * s,
        },
        { geo: 'MT', x: 0, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s },
        {
            geo: 'LI',
            x: 0.25 * s,
            y: 1.55 * s + 3 * p,
            width: 0.25 * s,
            height: 0.25 * s,
        },
        {
            geo: 'SJ_SV',
            x: 0.5 * s,
            y: 1.55 * s + 3 * p,
            width: 0.25 * s,
            height: 0.25 * s,
        },
        {
            geo: 'SJ_JM',
            x: 0.75 * s,
            y: 1.55 * s + 3 * p,
            width: 0.25 * s,
            height: 0.25 * s,
        },
        /*{geo:"IC", x:0, y:0}, {geo:"RE", x:dd, y:0}, {geo:"YT", x:2*dd, y:0},
        {geo:"GP", x:0, y:dd}, {geo:"MQ", x:dd, y:dd}, {geo:"GF",scale:"10M", x:2*dd, y:dd},
        {geo:"PT20", x:0, y:2*dd}, {geo:"PT30", x:dd, y:2*dd}, {geo:"MT", x:2*dd, y:2*dd},
        {geo:"LI",scale:"01M", x:0, y:3*dd}, {geo:"SJ_SV", x:dd, y:3*dd}, {geo:"SJ_JM",scale:"01M", x:2*dd, y:3*dd},*/
        //{geo:"CARIB", x:0, y:330}, {geo:"IS", x:dd, y:330}
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
