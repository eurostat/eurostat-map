import { select } from 'd3-selection'
import { mapTemplate } from './map-template'

/**
 * Build inset maps for a map template
 */
export const buildInsets = function (out, withCenterPoints) {
    if (!out.insetBoxPosition_) {
        out.insetBoxPosition_ = [out.width_ - out.insetBoxWidth_ - 2 * out.insetBoxPadding_, 2 * out.insetBoxPadding_]
    }

    // add container to drawing group
    // Cannot read properties of undefined (reading 'svgId')
    let svg = select('#' + out.svgId_)
    let drawingGroup = svg.select('#em-drawing-' + out.svgId_)
    const ing = drawingGroup
        .append('g')
        .attr('id', 'em-insets-group')
        .attr('class', 'em-insets')
        .attr('transform', 'translate(' + out.insetBoxPosition_[0] + ',' + out.insetBoxPosition_[1] + ')')

    if (out.insets_ === 'default') {
        //if needed, use default inset config
        out.insets_ = defaultInsetConfig(out.insetBoxWidth_, out.insetBoxPadding_)
    }

    // append each inset to map
    for (let i = 0; i < out.insets_.length; i++) {
        const config = out.insets_[i]
        config.svgId = config.svgId || 'inset' + config.geo + Math.random().toString(36).substring(7)

        //get svg element.
        let svg = select('#' + config.svgId)
        if (svg.size() == 0) {
            // Create it as an embeded SVG if it does not exist
            const x = config.x == undefined ? out.insetBoxPadding_ : config.x
            const y = config.y == undefined ? out.insetBoxPadding_ + i * (out.insetBoxPadding_ + out.insetBoxWidth_) : config.y
            const ggeo = ing
                .append('g')
                .attr('id', 'em-inset-' + config.svgId)
                .attr('class', 'em-inset')
                .attr('transform', 'translate(' + x + ',' + y + ')')
            ggeo.append('svg').attr('id', config.svgId)
        }

        // build inset
        // GISCO-2676 - PT azores inset has 2 insets with the same Geo, so second was overriding first:
        if (out.insetTemplates_[config.geo]) {
            //if inset already exists in map with same geo, then push both to an array
            let inset = buildInset(config, out, withCenterPoints)
            inset.buildMapTemplateBase()
            out.insetTemplates_[config.geo] = [out.insetTemplates_[config.geo], inset]
        } else {
            let inset = buildInset(config, out, withCenterPoints)
            let drawnInset = inset.buildMapTemplateBase()
            out.insetTemplates_[config.geo] = drawnInset
        }
    }

    return out
}

/** Build template for inset, based on main one */
const buildInset = function (config, out, withCenterPoints) {
    //TODO find a better way to do that

    //copy map
    //for(let key__ in map) {
    //mt[key__] = map[key__];
    //}

    const mt = mapTemplate(config, withCenterPoints)

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
            let id = out.insetTemplates_[template].svgId_
            let existing = select('#' + id)
            // if (existing) existing.remove()
            if (existing) existing.html('') // empty them, but dont remove them.
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
