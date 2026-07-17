import { select } from 'd3-selection'
import { createMapInstance } from './map-instance'
import { getDefaultScalebarConfig, mergeScalebarConfig, normalizeLegacyScalebarFields } from './decoration/scalebar'
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

    // Named inset presets. 'default' is the original simple grid layout. 'image', 'eu' and
    // 'euEfta' are hand-tuned overseas-territory arrangements; only 'image' draws the extra
    // connecting decoration (background box, separator lines, blur gradients).
    const presetName = typeof out.insets_ === 'string' ? out.insets_ : null
    if (presetName === 'default') {
        out.insets_ = defaultInsetConfig(out.insetBoxWidth_, out.insetBoxPadding_)
    } else if (presetName === 'image') {
        out.insets_ = overseasInsetConfig()
        insetsGroup
            .append('rect')
            .attr('class', 'em-insets-background')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', OVERSEAS_BOX_WIDTH)
            .attr('height', OVERSEAS_BOX_HEIGHT)
    } else if (presetName === 'eu') {
        out.insets_ = euInsetConfig()
    } else if (presetName === 'euEfta') {
        out.insets_ = euEftaInsetConfig()
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

    if (presetName === 'image') {
        buildOverseasInsetsDecoration(insetsGroup, out.insets_)
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

    // Built-in inset presets ('image', 'eu', 'euEfta') still use the deprecated flat scalebar
    // fields; normalize them onto `scalebar` here so every inset config path (built-in presets and
    // caller-supplied configs alike) ends up with a working scalebar_.
    config = normalizeLegacyScalebarFields(config)

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
    // Use mergeScalebarConfig (not a raw Object.assign) since callers commonly build this object
    // with `a ?? b` fallback chains, which can leave keys present but explicitly `undefined` —
    // Object.assign would copy those and clobber the default instead of falling back to it.
    if (config.scalebar === true) {
        config.scalebar = getDefaultScalebarConfig()
    } else if (config.scalebar && typeof config.scalebar === 'object') {
        config.scalebar = mergeScalebarConfig(config.scalebar)
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
    ]
    //hide graticule for insets
    for (let i = 0; i < out.length; i++) out[i].drawGraticule = false
    return out
}

/**
 * The 'eu' inset preset: a simple grid layout of EU overseas/outermost territories
 * (Canarias, Guadeloupe, Martinique, Guyane, Réunion, Mayotte, Malta, Açores, Madeira),
 * with no connecting decoration. Triggered via `.insets('eu')`.
 */
const euInsetConfig = function () {
    const h = 75
    const w = 70
    const p = 3
    const scalebarY = 58

    const config = [
        { geo: 'IC', x: 0, y: 0, width: w, height: h, title: 'Canarias (ES)', position: { z: 6000, x: 410000, y: 3180000 }, showScalebar: true, scalebarPosition: [1, scalebarY] },
        { geo: 'GP', x: w + p, y: 0, width: w, height: h, title: 'Guadeloupe (FR)', position: { x: 660000, y: 1800000 }, showScalebar: true, scalebarPosition: [1, scalebarY] },
        { geo: 'GP', x: w + p + 5, y: 15, width: 23, height: 15, position: { z: 1200, x: 493000, y: 1998000 } },
        {
            geo: 'MQ',
            x: w * 2 + p * 2,
            y: 0,
            width: w,
            height: h,
            title: 'Martinique (FR)',
            position: { z: 1000, x: 718021, y: 1621322 },
            showScalebar: true,
            scalebarPosition: [1, scalebarY],
        },
        {
            geo: 'GF',
            x: 0,
            y: h + p,
            width: w,
            height: h,
            position: { z: 7000, x: 295852, y: 484074 },
            title: 'Guyane (FR)',
            showScalebar: true,
            scalebarPosition: [40, scalebarY + 2],
            scalebarMaxWidth: 20,
        },
        { geo: 'RE', x: w + p, y: h + p, width: w, height: h, title: 'Réunion (FR)', showScalebar: true, scalebarPosition: [1, scalebarY] },
        { geo: 'YT', x: w * 2 + p * 2, y: h + p, width: w, height: h, title: 'Mayotte (FR)', showScalebar: true, scalebarPosition: [1, scalebarY] },
        { geo: 'MT', x: 0, y: 2 * h + 2 * p, width: w, height: h, title: 'Malta', showScalebar: true, scalebarPosition: [1, scalebarY] },
        {
            geo: 'PT20',
            x: w + p,
            y: 2 * h + 2 * p,
            width: w,
            height: h,
            position: { z: 3500, x: 440000, y: 4370000 },
            title: 'Açores (PT)',
            showScalebar: true,
            scalebarPosition: [44, scalebarY],
        },
        { geo: 'PT20', x: w + p + 35, y: 2 * h + 2 * p + 17, width: 30, height: 35, position: { z: 4000, x: 650000, y: 4150000 } },
        { geo: 'PT20', x: w + p + 5, y: 2 * h + 2 * p + 17, width: 20, height: 25, position: { z: 2500, x: 140000, y: 4390000 } },
        { geo: 'PT30', x: 2 * w + 2 * p, y: 2 * h + 2 * p, width: w, height: h, title: 'Madeira (PT)', showScalebar: true, scalebarPosition: [1, scalebarY] },
    ]

    config.forEach((c) => {
        if (!c.titlePosition) c.titlePosition = [2, 11]
        c.zoomButtons = false
        if (c.showScalebar) {
            c.scalebarTickHeight = 6
            c.scalebarSegmentHeight = 6
            c.scalebarFontSize = 7
            c.scalebarUnits = ''
            c.scalebarTextOffset = [0, 8]
            if (!c.scalebarMaxWidth) c.scalebarMaxWidth = 24
        }
    })
    return config
}

/**
 * The 'euEfta' inset preset: like 'eu', plus Liechtenstein and Svalbard for the EU/EFTA extent.
 * No connecting decoration. Triggered via `.insets('euEfta')`.
 */
const euEftaInsetConfig = function () {
    const h = 75
    const w = 67
    const p = 4
    const scalebarY = 58

    const config = [
        {
            geo: 'IC',
            x: 0,
            y: 0,
            width: w,
            height: h,
            title: 'Canarias (ES)',
            position: { z: 6900, x: 410000, y: 3180000 },
            showScalebar: true,
            scalebarPosition: [1, scalebarY],
            scalebarMaxWidth: 20,
        },
        {
            geo: 'GP',
            x: w + p,
            y: 0,
            width: w,
            height: h,
            title: 'Guadeloupe (FR)',
            position: { z: 1820, x: 660000, y: 1800000 },
            showScalebar: true,
            scalebarPosition: [1, scalebarY],
        },
        { geo: 'GP', x: w + p + 5, y: 15, width: 23, height: 15, position: { z: 1200, x: 493000, y: 1998000 }, showScalebar: false },
        { geo: 'MQ', x: 0, y: h + p, width: w, height: h, title: 'Martinique (FR)', showScalebar: true, scalebarPosition: [1, scalebarY] },
        {
            geo: 'GF',
            x: w + p,
            y: h + p,
            width: w,
            height: h,
            position: { z: 7000, x: 295852, y: 484074 },
            title: 'Guyane (FR)',
            showScalebar: true,
            scalebarPosition: [40, scalebarY],
            scalebarMaxWidth: 20,
        },
        { geo: 'RE', x: 0, y: 2 * h + 2 * p, width: w, height: h, title: 'Réunion (FR)', showScalebar: true, scalebarPosition: [1, scalebarY] },
        { geo: 'YT', x: w + p, y: 2 * h + 2 * p, width: w, height: h, title: 'Mayotte (FR)', showScalebar: true, scalebarPosition: [1, scalebarY] },
        { geo: 'MT', x: 0, y: 3 * h + 3 * p, width: w, height: h, title: 'Malta', showScalebar: true, scalebarPosition: [1, scalebarY] },
        {
            geo: 'PT20',
            x: w + p,
            y: 3 * h + 3 * p,
            width: w,
            height: h,
            position: { z: 4000, x: 440000, y: 4360000 },
            title: 'Açores (PT)',
            showScalebar: true,
            scalebarPosition: [43, scalebarY],
        },
        { geo: 'PT20', x: w + p + 40, y: 3 * h + 3 * p + 17, width: 23, height: 30, position: { z: 5000, x: 650000, y: 4150000 }, showScalebar: false },
        { geo: 'PT20', x: w + p + 5, y: 3 * h + 3 * p + 17, width: 15, height: 20, position: { z: 3500, x: 140000, y: 4390000 }, showScalebar: false },
        { geo: 'PT30', x: 0, y: 4 * h + 4 * p, width: w, height: h, title: 'Madeira (PT)', showScalebar: true, scalebarPosition: [1, scalebarY] },
        {
            geo: 'LI',
            x: w + p,
            y: 4 * h + 4 * p,
            width: w,
            height: h,
            title: 'Liechtenstein',
            subtitle: 'Liechtenstein',
            subtitlePosition: [2, 11],
            position: { x: 4285060, y: 2674000 },
            scale: '01M',
            showScalebar: true,
            scalebarPosition: [1, scalebarY],
        },
        {
            geo: 'SJ_SV',
            x: w + p,
            y: 5 * h + 5 * p,
            width: w,
            height: h,
            title: 'Svalbard (NO)',
            subtitlePosition: [2, 11],
            position: { x: 4570000, y: 6160156, z: 9000 },
            scale: '01M',
            showScalebar: true,
            scalebarPosition: [1, scalebarY],
        },
    ]

    config.forEach((c) => {
        c.titlePosition = [2, 11]
        c.zoomButtons = false
        if (c.showScalebar) {
            c.scalebarTickHeight = 6
            c.scalebarSegmentHeight = 6
            c.scalebarFontSize = 7
            c.scalebarUnits = ''
            c.scalebarTextOffset = [0, 8]
            if (!c.scalebarMaxWidth) c.scalebarMaxWidth = 14
        }
    })
    return config
}

// Fixed layout constants for the 'image' overseas inset preset below. Unlike the generic
// inset grid ('default') or the plain 'eu'/'euEfta' grids, these positions are hand-tuned
// per-territory (not derived from a caller-supplied box size), so the preset owns its own box
// dimensions rather than scaling with insetBoxWidth_/insetBoxPadding_.
const OVERSEAS_BOX_WIDTH = 243
const OVERSEAS_BOX_HEIGHT = 265
const OVERSEAS_UNIT = 210 // base unit territory positions/sizes are expressed as fractions of
const OVERSEAS_BOX_PADDING = 8
const OVERSEAS_INSET_PADDING = 3
const OVERSEAS_TITLE_FONT_SIZE = 8

/**
 * The 'image' inset preset: Malta, Liechtenstein, and the EU/EFTA overseas and remote
 * territories (Canarias, Guadeloupe, Martinique, Guyane, Réunion, Mayotte, Açores, Madeira,
 * Svalbard), laid out in a fixed, hand-tuned arrangement with connecting decoration (see
 * buildOverseasInsetsDecoration). Triggered via `.insets('image')`.
 */
const overseasInsetConfig = function () {
    const s = OVERSEAS_UNIT
    const p = OVERSEAS_INSET_PADDING
    const insetBoxPadding = OVERSEAS_BOX_PADDING
    const titleFontSize = OVERSEAS_TITLE_FONT_SIZE
    const firstColumnItemWidth = 0.35 * s
    const firstColumnItemHeight = 0.45 * s
    const secondColumnItemWidth = 0.375 * s
    const GPheight = 0.36 * s
    const GFheight = 0.45 * s
    const finalColumnX = insetBoxPadding + firstColumnItemWidth + p + secondColumnItemWidth + p * 3.5
    const finalColumnItemWidth = 0.3 * s
    const finalColumnItemHeight = 0.295 * s
    const finalRowItemY = finalColumnItemHeight * 3 + p + insetBoxPadding
    const finalRowItemWidth = 0.254 * s
    const finalRowItemHeight = 0.29 * s

    const config = [
        {
            geo: 'IC',
            x: insetBoxPadding,
            y: insetBoxPadding,
            width: firstColumnItemWidth - p,
            height: firstColumnItemHeight - 0.12 * s,
            title: 'Canarias (ES)',
            position: { x: 420000, y: 3150000, z: 6800 },
            scalebarPosition: [1, 55],
            showScalebar: true,
            scalebarMaxWidth: 30,
            scalebarUnits: ' km',
        },
        {
            geo: 'GP',
            x: insetBoxPadding + firstColumnItemWidth + p * 3,
            y: insetBoxPadding,
            width: secondColumnItemWidth,
            height: GPheight,
            title: 'Guadeloupe (FR)',
            position: { x: 680000, y: 1810000, z: 1820 },
            titlePosition: [0, 10],
            showScalebar: true,
            scalebarPosition: [48, 55],
        },
        {
            geo: 'GP',
            x: insetBoxPadding + firstColumnItemWidth + p * 3,
            y: insetBoxPadding + 18,
            width: 23,
            height: 15,
            position: { x: 493000, y: 1998000, z: 1200 },
            frameStrokeWidth: 0.8,
        },
        {
            geo: 'MQ',
            x: finalColumnX,
            y: insetBoxPadding,
            width: finalColumnItemWidth,
            height: finalColumnItemHeight,
            title: 'Martinique (FR)',
            position: { x: 716521, y: 1625000, z: 1800 },
            showScalebar: true,
            scalebarPosition: [0, 35],
        },
        {
            geo: 'MT',
            x: insetBoxPadding,
            y: firstColumnItemHeight + p + insetBoxPadding,
            width: firstColumnItemWidth,
            height: firstColumnItemHeight,
            title: 'Malta',
            position: { x: 4721000, y: 1440000, z: 900 },
            showScalebar: true,
            scalebarPosition: [1, 60],
        },
        {
            geo: 'GF',
            x: insetBoxPadding + firstColumnItemWidth + p * 3,
            y: GPheight + p + p + p + insetBoxPadding,
            width: secondColumnItemWidth - p,
            height: GFheight,
            title: 'Guyane (FR)',
            position: { x: 269852, y: 470000, z: 6500 },
            titlePosition: [0, 10],
            showScalebar: true,
            scalebarPosition: [48, 75],
            scalebarMaxWidth: 17,
        },
        {
            geo: 'RE',
            x: finalColumnX,
            y: finalColumnItemHeight + p + insetBoxPadding,
            width: finalColumnItemWidth,
            height: finalColumnItemHeight,
            title: 'Réunion (FR)',
            position: { x: 340011, y: 7671627, z: 2000 },
            showScalebar: true,
            scalebarPosition: [1, 40],
        },
        {
            geo: 'YT',
            x: finalColumnX,
            y: finalColumnItemHeight * 2 + p * 2 + insetBoxPadding,
            width: finalColumnItemWidth,
            height: finalColumnItemHeight,
            title: 'Mayotte (FR)',
            position: { z: 1200 },
            showScalebar: true,
            scalebarPosition: [1, 30],
        },
        {
            geo: 'PT20',
            x: insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            title: 'Açores (PT)',
            position: { x: 470000, y: 4370000, z: 5000 },
            processCentroids: (centroidFeatures) => {
                // adjust centroids
                return centroidFeatures.map((feature) => {
                    if (feature.properties.id == 'PT2' || feature.properties.id == 'PT20' || feature.properties.id == 'PT200') {
                        feature.geometry.coordinates[0] = 454540
                        feature.geometry.coordinates[1] = 4279765
                    }
                    return feature
                })
            },
            showScalebar: true,
            scalebarPosition: [34, 41],
        },
        {
            geo: 'PT20',
            x: insetBoxPadding + 3,
            y: finalRowItemY + titleFontSize + 8,
            width: 20,
            height: 20,
            position: { x: 140000, y: 4385000, z: 2800 },
            frameStrokeWidth: 0.8,
        },
        {
            geo: 'PT20',
            x: insetBoxPadding + 30,
            y: finalRowItemY + titleFontSize + 8,
            width: 20,
            height: 22,
            position: { x: 650000, y: 4140000, z: 6000 },
            processCentroids: (centroidFeatures) => {
                // adjust centroids
                return centroidFeatures.map((feature) => {
                    if (feature.properties.id == 'PT2' || feature.properties.id == 'PT20' || feature.properties.id == 'PT200') {
                        feature.geometry.coordinates[0] = 454540
                        feature.geometry.coordinates[1] = 4279765
                    }
                    return feature
                })
            },
            frameStrokeWidth: 0.8,
        },
        {
            geo: 'PT30',
            x: finalRowItemWidth + p + insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            title: 'Madeira (PT)',
            position: { x: 323586, y: 3632706, z: 2600 },
            titlePosition: [4, 11],
            showScalebar: true,
            scalebarPosition: [4, 41],
            scalebarMaxWidth: 25,
        },
        {
            geo: 'LI',
            x: finalRowItemWidth * 2 + p * 2 + insetBoxPadding + 2.5,
            y: finalRowItemY + 17,
            width: finalRowItemWidth - 5,
            height: finalRowItemHeight - 20,
            // title added separately by buildOverseasInsetsDecoration - the inset is too small
            // to fit a title inside it, so it's rendered as a halo'd label above the inset itself.
            position: { x: 4280060, y: 2669000, z: 900 },
            showScalebar: true,
            scalebarPosition: [4, 24],
        },
        {
            geo: 'SJ_SV',
            x: finalRowItemWidth * 3 + p * 3 + insetBoxPadding,
            y: finalRowItemY,
            width: finalRowItemWidth,
            height: finalRowItemHeight,
            title: 'Svalbard (NO)',
            position: { x: 4570000, y: 6240000, z: 12000 },
            showScalebar: true,
            scalebarPosition: [33, 41],
            scalebarMaxWidth: 17,
        },
    ]

    config.forEach((inset, i) => {
        inset.zoomButtons = false
        inset.drawGraticule = false
        if (!inset.titlePosition) inset.titlePosition = [2, 11]
        if (inset.showScalebar) {
            inset.scalebarTickHeight = 6
            inset.scalebarSegmentHeight = 6
            inset.scalebarFontSize = 7
            if (!inset.scalebarUnits) inset.scalebarUnits = ''
            inset.scalebarTextOffset = [0, 8]
            if (!inset.scalebarMaxWidth) inset.scalebarMaxWidth = 15
        }
        // Unique per call so rebuilding the map (e.g. a live settings change) doesn't collide
        // with stale DOM nodes from a previous build.
        inset.svgId = 'inset-' + i + '-' + Math.random().toString(16).slice(2)
    })

    return config
}

/**
 * Draws the connecting chrome around the 'image' overseas inset layout: the box background,
 * hand-positioned separator lines between adjacent territory insets, soft blur/fade gradients on
 * a few edges (French Guyane's box edge, Liechtenstein's cramped corner), and Liechtenstein's
 * title (rendered separately since its inset is too small to fit a title inside it).
 *
 * Every inset gets a `.em-frame` rect from the generic map-instance build path regardless of
 * preset; the separator lines above already provide the visual separation this layout wants, so
 * frames are hidden by default here and re-enabled only on the small zoomed-in detail insets
 * (Guadeloupe/Açores close-ups) that declare their own `frameStrokeWidth`, to help them read as
 * distinct from the territory they're zoomed into.
 * @param {*} insetsGroup d3 selection of the (already box-positioned) insets container group
 * @param {*} insetConfigs resolved inset config array, in the same order the insets were built
 */
const buildOverseasInsetsDecoration = function (insetsGroup, insetConfigs) {
    insetsGroup.selectAll('.em-frame').style('stroke', 'none', 'important')
    ;(insetConfigs || []).forEach((config) => {
        if (!config.frameStrokeWidth || !config.svgId) return
        insetsGroup
            .select('#em-inset-' + config.svgId + ' .em-frame')
            .style('stroke', 'grey', 'important')
            .style('stroke-width', config.frameStrokeWidth + 'px', 'important')
    })

    const lineColor = { class: 'em-inset-separator-line' }
    const thinLineColor = { class: 'em-inset-separator-line-thin' }

    const addLine = (x1, y1, x2, y2, thin) =>
        insetsGroup
            .append('line')
            .attr('class', (thin ? thinLineColor : lineColor).class)
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)

    // French territories separators (thin)
    addLine(160, 18, 170, 60, true)
    addLine(170, 60, 152, 92, true)
    addLine(152, 92, 90, 83, true)
    addLine(152, 92, 172, 131, true)
    addLine(172, 131, 171, 184, true)
    addLine(172, 131, 235, 139, true)
    addLine(170, 60, 235, 70, true)

    // Thick separators (between the main territory groups)
    addLine(91, 192, 235, 192)
    addLine(10, 192, 78, 192)
    addLine(84, 25, 84, 185)
    addLine(10, 92, 78, 92)
    addLine(117, 213, 117, 254)
    addLine(178, 213, 178, 254)

    // Portugal (Açores/Madeira) separator (thin)
    addLine(66, 213, 66, 254, true)

    // Blur/fade gradients (soft edges on a few insets that get visually cropped by the box)
    const defs = insetsGroup.append('defs')
    const gradients = [
        { id: 'em-inset-grad-l', x1: '100%', y1: '100%', x2: '0%', y2: '100%' },
        { id: 'em-inset-grad-r', x1: '0%', y1: '100%', x2: '100%', y2: '100%' },
        { id: 'em-inset-grad-b', x1: '100%', y1: '0%', x2: '100%', y2: '100%' },
        { id: 'em-inset-grad-t', x1: '100%', y1: '100%', x2: '100%', y2: '0%' },
    ]
    gradients.forEach(({ id, x1, y1, x2, y2 }) => {
        const gradient = defs.append('linearGradient').attr('id', id).attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2).attr('gradientUnits', 'objectBoundingBox')
        gradient.append('stop').attr('offset', '0').attr('stop-opacity', '0.1').attr('class', 'em-inset-blur-stop')
        gradient.append('stop').attr('offset', '1').attr('class', 'em-inset-blur-stop')
    })

    const blurRect = (x, y, height, width, gradId) =>
        insetsGroup.append('rect').attr('class', 'em-inset-blur').attr('x', x).attr('y', y).attr('height', height).attr('width', width).attr('fill', `url(#${gradId})`)

    blurRect(92, 180, 10, 75, 'em-inset-grad-b')
    blurRect(90, 106, 79, 10, 'em-inset-grad-l')
    // Liechtenstein gradients
    blurRect(123, 213, 42, 5, 'em-inset-grad-l')
    blurRect(167, 213, 42, 5, 'em-inset-grad-r')
    blurRect(123, 251, 5, 50, 'em-inset-grad-b')
    blurRect(123, 213, 5, 50, 'em-inset-grad-t')

    // Liechtenstein's title, rendered above its inset (too small to fit a title inside it).
    insetsGroup.append('text').attr('class', 'em-inset-title').attr('x', 122).attr('y', 207.85).text('Liechtenstein')
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
