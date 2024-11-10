import { zoom, zoomTransform } from 'd3-zoom'
import { select, selectAll, pointer } from 'd3-selection'
import { formatDefaultLocale } from 'd3-format'
import { geoIdentity, geoPath, geoGraticule, geoGraticule10, geoCentroid } from 'd3-geo'
import { geoRobinson } from 'd3-geo-projection'

import {
    getBBOXAsGeoJSON,
    spaceAsThousandSeparator,
    executeForAllInsets,
    getFontSizeFromClass,
    getCSSPropertyFromClass,
} from './utils'

import { DEFAULTLABELS, STATLABELPOSITIONS } from './labels'

import { defineDeprecatedFunctions } from './deprecated'
import { Geometries } from './geometries'

// set default d3 locale
formatDefaultLocale({
    decimal: '.',
    thousands: ' ',
    grouping: [3],
    currency: ['', '€'],
})

/**
 * The map template: only the geometrical part.
 * To be used as a base map for a statistical map.
 *
 * @param {*} withCenterPoints Set to true (or 1) to add regions center points to the map template, to be used for proportional symbols maps for example.
 */
export const mapTemplate = function (config, withCenterPoints) {
    //build map template object
    const out = {}

    //map
    out.svgId_ = 'map'
    out.svg_ = undefined
    out.width_ = Math.min(800, window.innerWidth)
    out.height_ = 0
    out.containerId_ = undefined

    //geographical focus
    out.nutsLevel_ = 3 // 0,1,2,3, or 'mixed'
    out.nutsYear_ = 2021
    out.geo_ = 'EUR'
    out.proj_ = '3035'
    out.projectionFunction_ = undefined // e.g. d3.geoRobinson()
    out.filterGeometriesFunction_ = undefined // user defined filter function
    out.scale_ = '20M' //TODO choose automatically, depending on pixelSize ?
    out.geoCenter_ = undefined
    out.pixelSize_ = undefined
    out.zoomExtent_ = undefined

    //common / shared styles
    out.fontFamily_ = 'Helvetica, Arial, sans-serif'

    //map title
    out.title_ = ''
    out.titlePosition_ = undefined

    //map subtitle
    out.subtitle_ = ''
    out.subtitlePosition_ = undefined

    //map frame (none by default)
    out.frameStroke_ = 'none'
    out.frameStrokeWidth_ = 0.3

    //scalebar
    out.showScalebar_ = false
    out.scalebarPosition_ = []
    out.scalebarUnits_ = ' km' //label
    out.scalebarTextOffset_ = [0, 12]
    out.scalebarMaxWidth_ = 150 //px
    out.scalebarHeight_ = 90 //px
    out.scalebarStrokeWidth_ = 1 //px
    out.scalebarSegmentHeight_ = 6
    out.scalebarTickHeight_ = 8

    //tooltip
    //default config
    out.tooltip_ = {
        fontSize: '14px',
        transitionDuration: 200,
        xOffset: 0,
        yOffset: 0,
        textFunction: null,
        showFlags: false,
    } //  See tooltip.js for more details

    out.tooltipText_ = (rg) => {
        return rg.properties.na
    } //DEPRECATED use tooltip_.textFunction
    out.tooltipShowFlags_ = false //DEPRECATED use tooltip_.textFunction

    //template default style
    //countries to include with default geometries
    out.bordersToShow_ = ['eu', 'efta', 'cc', 'oth', 'co']
    out.countriesToShow_ = [
        'AL',
        'AT',
        'BE',
        'BG',
        'CH',
        'CY',
        'CZ',
        'DE',
        'DK',
        'EE',
        'EL',
        'ES',
        'FI',
        'FR',
        'HR',
        'HU',
        'IE',
        'IS',
        'IT',
        'LI',
        'LT',
        'LU',
        'LV',
        'ME',
        'MK',
        'MT',
        'NL',
        'NO',
        'PL',
        'PT',
        'RO',
        'RS',
        'SE',
        'SI',
        'SK',
        'TR',
        'UK',
    ]

    //nuts hover color
    out.hoverColor_ = 'red' // USE CSS

    //sea
    out.drawCoastalMargin_ = false
    out.coastalMarginStdDev_ = 2
    //graticule
    out.drawGraticule_ = false

    //labelling (country names and geographical features)
    out.labelling_ = false
    out.labelsConfig_ = DEFAULTLABELS // allow user to override map labels | see ./labels.js for example config
    out.statLabelsPositions_ = STATLABELPOSITIONS // allow user to override positions of statistical labels
    out.labelsToShow_ = ['countries', 'seas'] //accepted: "countries", "cc","seas", "values"
    out.labelShadowsToShow_ = ['countries', 'seas']
    out.labelShadow_ = true

    out.labelFilterFunction_ = (rg, map) => {
        return rg.properties.id[0] + rg.properties.id[1] == map.geo_[0] + map.geo_[1] || map.geo_ == 'SJ_SV'
    } // filter the regions used for the labels array

    //dataset source link
    out.showSourceLink_ = true

    //default copyright and disclaimer text
    out.footnote_ = 'Administrative boundaries: \u00A9EuroGeographics \u00A9UN-FAO \u00A9INSTAT \u00A9Turkstat' //"(C)EuroGeographics (C)UN-FAO (C)Turkstat";
    // out.footnoteTooltipText_ =
    //     'The designations employed and the presentation of material on this map do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence.'

    out.nuts2jsonBaseURL_ = window.location.hostname.includes('ec.europa.eu')
        ? 'https://ec.europa.eu/assets/estat/E/E4/gisco/pub/nuts2json/v2/'
        : 'https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2/'

    //style for no data regions
    out.noDataFillStyle_ = '#bcbcbc'

    /**
     * Insets.
     * The map template has a recursive structure.
     */

    //insets to show, as a list of map template configs. Ex.: [{geo:"MT"},{geo:"LI"},{geo:"PT20"}]
    out.insets_ = []
    //inset templates - each inset is a map-template instance.
    out.insetTemplates_ = {}

    out.insetBoxPosition_ = undefined
    out.insetBoxPadding_ = 5
    out.insetBoxWidth_ = 210
    //out.insetZoomExtent_ = [1, 3];
    out.insetZoomExtent_ = null //zoom disabled as default
    out.insetScale_ = '03M'

    // [{id:String, data:geojson, class:function}] user-defined geometries
    out.geometries_ = undefined

    /**
     * Definition of getters/setters for all previously defined attributes.
     * Each method follow the same pattern:
     *  - There is a single method as getter/setter of each attribute. The name of this method is the attribute name, without the trailing "_" character.
     *  - To get the attribute value, call the method without argument.
     *  - To set the attribute value, call the same method with the new value as single argument.
     */
    for (const att in out) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = v
            return out
        }
    }

    // warn existing users of functions that have been banished to the shadow realm.
    defineDeprecatedFunctions(out)

    //special ones which affect also the insets
    ;['tooltip_', 'nuts2jsonBaseURL_'].forEach(function (att) {
        out[att.substring(0, att.length - 1)] = function (v) {
            if (!arguments.length) return out[att]

            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                //override default properties
                for (const p in v) {
                    out[att][p] = v[p]
                }
            } else {
                out[att] = v
            }

            //recursive call to inset components
            if (out.insetTemplates_) {
                executeForAllInsets(
                    out.insetTemplates_,
                    out.svgId_,
                    (inset, value) => {
                        const fnName = att.substring(0, att.length - 1)
                        inset[fnName](value)
                    },
                    v
                )
            }
            return out
        }
    })

    //title getter and setter
    out.title = function (v) {
        if (!arguments.length) return out.title_
        out.title_ = v
        if (out.svg())
            out.svg()
                .select('#title' + out.geo())
                .text(v)
        return out
    }

    //subtitle getter and setter
    out.subtitle = function (v) {
        if (!arguments.length) return out.subtitle_
        out.subtitle_ = v
        if (out.svg())
            out.svg()
                .select('#subtitle' + out.geo())
                .text(v)
        return out
    }

    //insets getter/setter
    out.insets = function () {
        if (!arguments.length) return out.insets_
        if (arguments.length == 1 && arguments[0] === 'default') out.insets_ = 'default'
        else if (arguments.length == 1 && arguments[0] === false) out.insets_ = false
        else if (arguments.length == 1 && Array.isArray(arguments[0])) out.insets_ = arguments[0]
        else out.insets_ = arguments
        return out
    }

    // dynamic draw graticule
    out.drawGraticule = function (v) {
        if (!arguments.length) return out.drawGraticule_
        out.drawGraticule_ = v

        //update graticule
        let graticule = out.svg_ ? out.svg().select('#em-graticule') : null
        let zg = out.svg_ ? out.svg_.select('#em-zoom-group-' + out.svgId_) : null

        // if existing and argument is false
        if (graticule) {
            if (graticule._groups[0][0] && v == false) {
                //remove graticule
                graticule.remove()

                // if map already created and argument is true
            } else if (out.Geometries.geoJSONs.graticule && out._pathFunction && zg && v == true) {
                //remove existing graticule
                graticule.remove()
                // add new graticule
                zg.append('g')
                    .attr('id', 'em-graticule')
                    .selectAll('path')
                    .data(out.Geometries.geoJSONs.graticule)
                    .enter()
                    .append('path')
                    .attr('d', out._pathFunction)
                    .attr('class', 'em-graticule')

                out.svg()
                    .select('#em-graticule')
                    .each(function () {
                        // move graticule behind land mass
                        out.geo_ == 'WORLD'
                            ? this.parentNode.insertBefore(this, this.parentNode.childNodes[3])
                            : this.parentNode.insertBefore(this, this.parentNode.childNodes[1])
                    })
            }
        }
        return out
    }

    //coastal margin override
    out.drawCoastalMargin = function (v) {
        if (!arguments.length) return out.drawCoastalMargin_
        out.drawCoastalMargin_ = v

        //update existing
        if (out.svg_) {
            let margin = selectAll('#em-coast-margin')
            let filter = select('#em-coastal-blur')
            let zg = select('#em-zoom-group-' + out.svgId_) || null
            if (margin._groups[0][0] && v == false) {
                // remove existing
                margin.remove()
            } else if (v == true && out._pathFunction && zg) {
                //remove existing graticule
                margin.remove()
                filter.remove()
                //add filter
                out.svg_
                    .append('filter')
                    .attr('id', 'em-coastal-blur')
                    .attr('x', '-200%')
                    .attr('y', '-200%')
                    .attr('width', '400%')
                    .attr('height', '400%')
                    .append('feGaussianBlur')
                    .attr('in', 'SourceGraphic')
                    .attr('stdDeviation', out.coastalMarginStdDev_)

                //draw for main map - geometries are still in memory so no rebuild needed
                const drawNewCoastalMargin = (map) => {
                    // zoom group might not be inside main map (out.svg_)
                    const zoomGroup = select('#em-zoom-group-' + map.svgId_)
                    //draw new coastal margin
                    const cg = zoomGroup.append('g').attr('id', 'em-coast-margin')

                    //countries bn
                    if (map._geom.cntbn)
                        cg.append('g')
                            .attr('id', 'em-coast-margin-cnt')
                            .selectAll('path')
                            .data(map._geom.cntbn)
                            .enter()
                            .filter(function (bn) {
                                return bn.properties.co === 'T'
                            })
                            .append('path')
                            .attr('d', map._pathFunction)
                    //nuts bn
                    if (map._geom.nutsbn)
                        cg.append('g')
                            .attr('id', 'em-coast-margin-nuts')
                            .selectAll('path')
                            .data(map._geom.nutsbn)
                            .enter()
                            .filter(function (bn) {
                                return bn.properties.co === 'T'
                            })
                            .append('path')
                            .attr('d', map._pathFunction)
                    //world bn
                    if (map._geom.worldbn)
                        cg.append('g')
                            .attr('id', 'em-coast-margin-nuts')
                            .selectAll('path')
                            .data(map._geom.worldbn)
                            .enter()
                            .filter(function (bn) {
                                return bn.properties.COAS_FLAG === 'T'
                            })
                            .append('path')
                            .attr('d', map._pathFunction)
                }

                //draw for insets - requires geometries so we have to rebuild base template
                if (out.insetTemplates_ && out.drawCoastalMargin_) {
                    executeForAllInsets(out.insetTemplates_, out.svgId_, drawNewCoastalMargin)
                    drawNewCoastalMargin(out)
                }

                // move margin to back (in front of sea)
                selectAll('#em-coast-margin').each(function () {
                    out.geo_ == 'WORLD'
                        ? this.parentNode.insertBefore(this, this.parentNode.childNodes[3])
                        : this.parentNode.insertBefore(this, this.parentNode.childNodes[1])
                })
            }
        }
        return out
    }

    // coastal margin width override
    out.coastalMarginWidth = function (v) {
        if (!arguments.length) return out.coastalMarginWidth_
        out.coastalMarginWidth_ = v

        //update insets
        for (const geo in out.insetTemplates_) {
            if (Array.isArray(out.insetTemplates_[geo])) {
                // check for insets within insets
                for (var i = 0; i < out.insetTemplates_[geo].length; i++) {
                    //check for insets within insets within insets
                    if (Array.isArray(out.insetTemplates_[geo][i])) {
                        for (var n = 0; n < out.insetTemplates_[geo][i].length; n++) {
                            let inset = out.insetTemplates_[geo][i][n]
                            //set
                            inset.coastalMarginWidth_ = out.coastalMarginWidth_
                            //redraw
                            inset.drawCoastalMargin(true)
                        }
                    } else {
                        let inset = out.insetTemplates_[geo][i]
                        //set
                        inset.coastalMarginWidth_ = out.coastalMarginWidth_
                        //redraw
                        inset.drawCoastalMargin(true)
                    }
                }
            } else {
                let inset = out.insetTemplates_[geo]
                //set
                inset.coastalMarginWidth_ = out.coastalMarginWidth_
                //redraw
                inset.drawCoastalMargin(true)
            }
        }

        //redraw
        out.drawCoastalMargin(true)

        return out
    }

    // initiate Geometries class
    out.Geometries = Geometries(out, withCenterPoints)

    /**
     * Requests geographic data and then builds the map template
     */
    out.updateGeoMapTemplate = function (callback) {
        // Erase previous data
        out.Geometries.geoData = null
        out.Geometries.allNUTSGeoData = null
        out.Geometries.centroidsData = null

        if (out.geometries_) {
            out.Geometries.setUserGeometries(out.geometries_)
            // use custom user-defined geometries
            out.buildMapTemplate()

            // Execute callback if defined
            if (callback) callback()
        } else {
            // use default
            out.Geometries.getDefaultGeoData(out.geo_, out.filterGeometriesFunction_, out.nutsLevel_).then(() => {
                out.buildMapTemplate()

                // Execute callback if defined
                if (callback) callback()
            })
        }

        // Use executeForAllInsets for recursive inset updates
        executeForAllInsets(out.insetTemplates_, out.svgId_, (inset) => {
            inset.updateGeoMapTemplate(callback)
        })

        return out
    }

    /**
     * Build a map object, including container, frame, map svg, insets and d3 zoom
     */
    out.buildMapTemplateBase = function () {
        //get svg element. Create it if it does not exists
        let svg = select('#' + out.svgId())
        if (svg.size() == 0) {
            svg = select('body').append('svg').attr('id', out.svgId())
        }
        svg.attr('class', 'em-map')
        out.svg_ = svg

        //set container for cases where container contains various maps
        if (!out.containerId_) out.containerId_ = out.svgId_
        //tooltip needs to know container to prevent overflow
        if (!out.tooltip_.containerId) {
            out.tooltip_.containerId = out.containerId_
        }

        //clear SVG (to avoid building multiple svgs on top of each other during multiple build() calls)
        selectAll('#' + out.svgId() + ' > *').remove()

        //set SVG dimensions
        if (out.geo_.toUpperCase() == 'WORLD') {
            //if no height was specified, use 45% of the width.
            if (!out.height()) out.height(0.55 * out.width())
            svg.attr('width', out.width()).attr('height', out.height())

            //WORLD geo only accepts proj 54030 (robinson) at the moment
            out.proj_ = 54030
        }
        //if no height was specified, use 85% of the width.
        if (!out.height()) out.height(0.85 * out.width())
        svg.attr('width', out.width()).attr('height', out.height())

        // each map template needs a clipPath to avoid overflow. See GISCO-2707
        svg.append('defs')
            .attr('class', 'em-defs')
            .append('clipPath')
            .attr('id', out.svgId_ + '-clip-path')
            .append('path')
            .attr('d', convertRectangles(0, 0, out.width_, out.height_))

        if (out.drawCoastalMargin_) {
            //define filter for coastal margin
            svg.append('filter')
                .attr('id', 'em-coastal-blur')
                .attr('x', '-200%')
                .attr('y', '-200%')
                .attr('width', '400%')
                .attr('height', '400%')
                .append('feGaussianBlur')
                .attr('in', 'SourceGraphic')
                .attr('stdDeviation', out.coastalMarginStdDev_)
        }

        //create drawing group, as first child
        const dg = svg
            .insert('g', ':first-child')
            .attr('id', 'em-drawing-' + out.svgId_)
            .attr('class', 'em-drawing-group')
            .attr('clip-path', 'url(#' + out.svgId_ + '-clip-path' + ')')

        //create main zoom group
        const zg = dg
            .append('g')
            .attr('id', 'em-zoom-group-' + out.svgId_)
            .attr('class', 'em-zoom-group') //out.geo changed to out.svgId in order to be unique

        //insets
        out.removeInsets() //remove existing
        out.buildInsets() //build new

        //draw frame
        dg.append('rect')
            .attr('id', 'em-frame-' + out.geo_)
            .attr('class', 'em-frame')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', out.width_)
            .attr('height', out.height_)

        //make drawing group zoomable
        if (out.zoomExtent()) {
            let xoo = zoom()
                .scaleExtent(out.zoomExtent())
                .on('zoom', function (e) {
                    zg.attr('transform', e.transform)
                })
            svg.call(xoo)
        }

        return out
    }

    /**
     * Remove insets maps from the DOM
     */
    out.removeInsets = function () {
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
     * Build inset maps for a map template
     */
    out.buildInsets = function () {
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
                const y =
                    config.y == undefined ? out.insetBoxPadding_ + i * (out.insetBoxPadding_ + out.insetBoxWidth_) : config.y
                const ggeo = ing
                    .append('g')
                    .attr('id', 'insetzg' + config.svgId)
                    .attr('transform', 'translate(' + x + ',' + y + ')')
                ggeo.append('svg').attr('id', config.svgId)
            }

            // build inset
            // GISCO-2676 - PT azores inset has 2 insets with the same Geo, so second was overriding first:
            if (out.insetTemplates_[config.geo]) {
                //if inset already exists in map with same geo, then push both to an array
                let inset = buildInset(config, out)
                inset.buildMapTemplateBase()
                out.insetTemplates_[config.geo] = [out.insetTemplates_[config.geo], inset]
            } else {
                let inset = buildInset(config, out)
                let drawnInset = inset.buildMapTemplateBase()
                out.insetTemplates_[config.geo] = drawnInset
            }
        }

        return out
    }

    const defineGeoCenter = function () {
        const defaultPosition = _defaultPosition[out.geo_ + '_' + out.proj_]
        if (defaultPosition) {
            out.geoCenter(defaultPosition.geoCenter)
        } else if (out.Geometries.geoData?.bbox) {
            out.geoCenter([
                0.5 * (out.Geometries.geoData.bbox[0] + out.Geometries.geoData.bbox[2]),
                0.5 * (out.Geometries.geoData.bbox[1] + out.Geometries.geoData.bbox[3]),
            ])
        } else {
            //TODO: auto-define user=defined geometries geoCenter
        }
    }

    const definePixelSize = function () {
        const defaultPosition = _defaultPosition[out.geo_ + '_' + out.proj_]
        if (defaultPosition) {
            out.pixelSize((defaultPosition.pixelSize * 800) / out.width_)
        } else if (out.Geometries.geoData?.bbox) {
            out.pixelSize(
                Math.min(
                    (out.Geometries.geoData.bbox[2] - out.Geometries.geoData.bbox[0]) / out.width_,
                    (out.Geometries.geoData.bbox[3] - out.Geometries.geoData.bbox[1]) / out.height_
                )
            )
        } else {
        }
    }

    const defineProjection = function () {
        //SVG drawing function
        //compute geo bbox from geocenter, pixelSize and SVG dimensions
        const bbox = [
            out.geoCenter_[0] - 0.5 * out.pixelSize_ * out.width_,
            out.geoCenter_[1] - 0.5 * out.pixelSize_ * out.height_,
            out.geoCenter_[0] + 0.5 * out.pixelSize_ * out.width_,
            out.geoCenter_[1] + 0.5 * out.pixelSize_ * out.height_,
        ]

        //WORLD geo uses 4326 geometries and reprojects to 54030 using d3
        if (out.geo_ == 'WORLD') {
            out._projection = out.projectionFunction_
                ? out.projectionFunction_
                : geoRobinson()
                      // center and scale to container properly
                      .translate([out.width_ / 2, out.height_ / 2])
                      .scale((out.width_ - 20) / 2 / Math.PI)
        } else {
            out._projection = out.projectionFunction_
                ? out.projectionFunction_
                : geoIdentity().reflectY(true).fitSize([out.width_, out.height_], getBBOXAsGeoJSON(bbox))
        }
    }

    const definePathFunction = function () {
        out._pathFunction = geoPath().projection(out._projection)
    }

    /**
     * Buid an empty map template, based on the geometries only.
     */
    out.buildMapTemplate = function () {
        //geo center and extent: if not specified, use the default one, or the compute one from the topojson bbox
        if (!out.geoCenter_) {
            defineGeoCenter()
        }

        //pixel size (zoom level): if not specified, compute value from SVG dimensions and topojson geographical extent
        if (!out.pixelSize_) {
            definePixelSize()
        }

        defineProjection()
        definePathFunction()

        //prepare drawing group
        const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
        zoomGroup.selectAll('*').remove()

        //draw background rectangle
        zoomGroup
            .append('rect')
            .attr('id', 'sea')
            .attr('class', 'em-sea')
            .attr('x', -5 * out.width_)
            .attr('y', -5 * out.height_)
            .attr('width', 11 * out.width_)
            .attr('height', 11 * out.height_)

        //sphere for world map
        if (out.geo_ == 'WORLD') {
            zoomGroup
                .append('path')
                .datum({ type: 'Sphere' })
                .attr('id', 'sphere')
                .attr('d', out._pathFunction)
                .attr('class', 'em-graticule')
        }

        if (out.drawCoastalMargin_) {
            addCoastalMarginToMap()
        }

        if (out.geometries_) {
            out.Geometries.addUserGeometriesToMap(out.geometries_, zoomGroup, out._pathFunction)
        } else {
            out.Geometries.addDefaultGeometriesToMap(
                zoomGroup,
                out.bordersToShow_,
                out.drawGraticule_,
                out._pathFunction,
                out.nutsLevel_,
                out.geo_,
                out.proj_,
                out.scale_
            )
        }

        //prepare group for proportional symbols, with centroids
        if (withCenterPoints) {
            addCentroidsToMap()
        }

        // add geographical labels to map
        if (out.labelling_) {
            addLabelsToMap(out, zoomGroup)
        }

        //title
        if (out.title()) {
            //define default position
            let cssClass = out.isInset ? 'em-inset-title' : 'em-title'
            if (!out.titlePosition()) out.titlePosition([10, getFontSizeFromClass(cssClass) + (out.isInset ? 0 : 10)])
            //draw title
            out.svg()
                .append('text')
                .attr('id', 'title' + out.geo_)
                .attr('class', cssClass)
                .attr('x', out.titlePosition()[0])
                .attr('y', out.titlePosition()[1])
                .text(out.title())
        }

        if (out.subtitle()) {
            let cssSubtitleClass = out.isInset ? 'em-inset-subtitle' : 'em-subtitle'
            let cssTitleClass = out.isInset ? 'em-inset-title' : 'em-title'
            //define default position
            if (!out.subtitlePosition())
                out.subtitlePosition([10, getFontSizeFromClass(cssTitleClass) + getFontSizeFromClass(cssSubtitleClass) + 15])
            //draw subtitle
            out.svg()
                .append('text')
                .attr('id', 'subtitle' + out.geo_)
                .attr('class', cssSubtitleClass)
                .attr('x', out.subtitlePosition()[0])
                .attr('y', out.subtitlePosition()[1])
                .text(out.subtitle())
        }

        //bottom text
        if (out.footnote_) {
            addFootnote()
        }

        //source dataset URL
        if (out.showSourceLink_) {
            let stat
            if (withCenterPoints) {
                stat = out.stat('size')
            } else {
                stat = out.stat()
            }
            if (stat) {
                if (stat.eurostatDatasetCode) {
                    //dataset link
                    let code = stat.eurostatDatasetCode
                    let url = `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table?lang=en`
                    let linkColor = getCSSPropertyFromClass('em-source-dataset-link', 'fill')
                    let link = out
                        .svg()
                        .append('a')
                        .attr('href', url)
                        .attr('target', '_blank')
                        .append('text')
                        .attr('class', 'em-source-dataset-link')
                        .attr('x', out.width_)
                        .attr('y', out.height_)
                        .text('EUROSTAT')
                        .attr('text-anchor', 'end')

                    //pretext "Source:"
                    let linkW = link.node().getComputedTextLength()
                    out.svg()
                        .append('text')
                        .attr('class', 'em-source-pretext')
                        .attr('x', out.width_ - linkW - 2)
                        .attr('y', out.height_)
                        .text('Source:')
                        .attr('text-anchor', 'end')
                }
            }
        }

        //add scalebar
        if (out.showScalebar_) {
            if (out.scalebarPosition_.length !== 2) {
                out.scalebarPosition_[0] = 15
                out.scalebarPosition_[1] = out.height_ - 50
            }
            addScalebarToMap()
        }

        return out
    }

    const addFootnote = function () {
        out.svg()
            .append('text')
            .attr('id', 'em-footnote')
            .attr('class', 'em-footnote')
            .attr('x', 0)
            .attr('y', out.height_)
            .html(out.footnote_)
            .on('mouseover', function () {
                out._tooltip.mw___ = out._tooltip.style('max-width')
                out._tooltip.style('max-width', '400px')
                if (out.footnoteTooltipText_) out._tooltip.mouseover(out.footnoteTooltipText_)
            })
            .on('mousemove', function (e) {
                if (out.footnoteTooltipText_) out._tooltip.mousemove(e)
            })
            .on('mouseout', function (e) {
                if (out.footnoteTooltipText_) out._tooltip.mouseout(e)
                out._tooltip.style('max-width', out._tooltip.mw___)
            })
    }

    const addCoastalMarginToMap = function () {
        const zg = out.svg().select('#em-zoom-group-' + out.svgId_)
        //draw coastal margin
        const cg = zg.append('g').attr('id', 'em-coast-margin').attr('class', 'em-coast-margin')

        //countries bn
        if (out.Geometries.geoJSONs.cntbn) {
            cg.append('g')
                .attr('id', 'em-coast-margin-cnt')
                .attr('class', 'em-coast-margin-cnt')
                .selectAll('path')
                .data(out.Geometries.geoJSONs.cntbn)
                .enter()
                .filter(function (bn) {
                    return bn.properties.co === 'T'
                })
                .append('path')
                .attr('d', out._pathFunction)
        }

        //nuts bn
        if (out.Geometries.geoJSONs.nutsbn) {
            cg.append('g')
                .attr('id', 'em-coast-margin-nuts')
                .attr('class', 'em-coast-margin-nuts')
                .selectAll('path')
                .data(out.Geometries.geoJSONs.nutsbn)
                .enter()
                .filter(function (bn) {
                    return bn.properties.co === 'T'
                })
                .append('path')
                .attr('d', out._pathFunction)
        }

        //world bn
        if (out.Geometries.geoJSONs.worldbn) {
            cg.append('g')
                .attr('id', 'em-coast-margin-world')
                .attr('class', 'em-coast-margin-world')
                .selectAll('path')
                .data(out.Geometries.geoJSONs.worldbn)
                .enter()
                .filter(function (bn) {
                    return bn.properties.COAS_FLAG === 'T'
                })
                .append('path')
                .attr('d', out._pathFunction)
        }
    }

    const addCentroidsToMap = function () {
        let centroidFeatures

        if (!out.Geometries.centroidsData) {
            // if centroids data is absent (e.g. for world maps) then calculate manually
            if (out.geo_ == 'WORLD') {
                centroidFeatures = []
                out.Geometries.geoJSONs.worldrg.forEach((feature) => {
                    let newFeature = { ...feature }
                    // exception for France (because guyane)
                    if (feature.properties.id == 'FR') {
                        newFeature.geometry = {
                            coordinates: [2.2, 46.2],
                            type: 'Point',
                        }
                    } else {
                        newFeature.geometry = {
                            coordinates: geoCentroid(feature),
                            type: 'Point',
                        }
                    }
                    centroidFeatures.push(newFeature)
                })
            }
        } else {
            if (out.nutsLevel_ == 'mixed') {
                centroidFeatures = [
                    ...out.Geometries.centroidsData[0].features,
                    ...out.Geometries.centroidsData[1].features,
                    ...out.Geometries.centroidsData[2].features,
                    ...out.Geometries.centroidsData[3].features,
                ]
            } else {
                centroidFeatures = out.Geometries.centroidsData.features
            }
        }

        out._centroidFeatures = centroidFeatures

        // g_ps is the g element containing all proportional symbols for the map
        const zg = out.svg().select('#em-zoom-group-' + out.svgId_)
        const gcp = zg.append('g').attr('id', 'g_ps')

        // add centroid em-symbol elements
        gcp.selectAll('g')
            .data(out._centroidFeatures)
            .enter()
            .append('g')
            .attr('transform', function (d) {
                let coords = out._projection(d.geometry.coordinates)
                return 'translate(' + coords[0].toFixed(3) + ',' + coords[1].toFixed(3) + ')'
            })
            .attr('class', 'em-symbol') // OUR SYMBOL CONTAINER
            .attr('id', (d) => 'ps' + d.properties.id)
    }

    /**
     * @function updateLabels
     * @description update existing map labels
     */
    out.updateLabels = function () {
        // Clear previous labels
        let prevLabels = out.svg_.selectAll('g.g_labels > *')
        if (prevLabels) prevLabels.remove()

        // Main map
        if (out.labelling_) {
            let zg = out.svg_.select('#em-zoom-group-' + out.svgId_)
            addLabelsToMap(out, zg)
            if (out.labelsToShow_.includes('values') && out.updateValuesLabels) {
                out.updateValuesLabels(out)
            }
        }

        // Define the callback to apply to each inset
        const applyLabelsCallback = (map) => {
            if (map.labelling_) {
                let zg = map.svg_.select('#em-zoom-group-' + map.svgId_)
                addLabelsToMap(map, zg)
                if (map.labelsToShow_.includes('values') && out.updateValuesLabels) {
                    out.updateValuesLabels(map)
                }
            }
        }

        // Apply labels to all insets using the executeForAllInsets function
        if (out.insetTemplates_) {
            executeForAllInsets(out.insetTemplates_, out.svgId_, applyLabelsCallback)
        }
    }

    /**
     * @description update the statistical values labels on the map
     * @param {Object} map eurostat-map map instance
     * @return {} out
     */
    out.updateValuesLabels = function (map) {
        //clear previous labels
        let prevLabels = map.svg_.selectAll('g.em-stat-label > *')
        prevLabels.remove()
        let prevShadows = map.svg_.selectAll('g.em-stat-label-shadow > *')
        prevShadows.remove()

        let statLabels = map.svg_.selectAll('g.em-stat-label')

        // filter stat-label elements to only show those with data
        statLabels.filter(out.statLabelsFilterFunction).append('text').text(out.statLabelsTextFunction)

        //add shadows to labels
        if (out.labelShadow_) {
            map.svg_
                .selectAll('g.em-stat-label-shadow')
                .filter(out.statLabelsFilterFunction)
                .append('text')
                .text(out.statLabelsTextFunction)
        }
        return out
    }

    /**
     * @description text function for statistical labelling
     * @param {Object} d d3 selection json data element
     * @return {string}
     */
    out.statLabelsTextFunction = (d) => {
        if (out.countriesToShow_.includes(d.properties.id[0] + d.properties.id[1]) || out.geo_ == 'WORLD') {
            const s = out.statData()
            const sv = s.get(d.properties.id)

            if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                return ''
            } else {
                if (sv.value !== ':') {
                    return spaceAsThousandSeparator(sv.value)
                }
            }
        }
    }

    /**
     * @description function for filtering statistical labels
     * @param {Object} d d3 selection json data element
     * @return {boolean}
     */
    out.statLabelsFilterFunction = (d) => {
        if (out.countriesToShow_.includes(d.properties.id[0] + d.properties.id[1]) || out.geo_ == 'WORLD') {
            const s = out.statData()
            const sv = s.get(d.properties.id)
            if (!sv || (!sv.value && sv !== 0 && sv.value !== 0)) {
                return false
            } else {
                return true
            }
        }
        return false
    }

    /**
     * @function addLabelsToMap
     * @description appends text labels to the map. Labels can be countries, country codes, ocean names or statistical values
     */
    function addLabelsToMap(map, zg) {
        let labels = map.labelsConfig_
        let language = map.lg_
        let labelsArray = []

        let existing = zg.select('#g_labels')
        let labelsG = existing.empty() ? zg.append('g').attr('id', 'g_labels') : existing

        //define which labels to use (cc, countries, seas, values)
        if (map.labelsToShow_.includes('countries') || map.labelsToShow_.includes('seas')) {
            if (labels[map.geo_ + '_' + map.proj_] && labels[map.geo_ + '_' + map.proj_][language]) {
                labelsArray = labels[map.geo_ + '_' + map.proj_][language] || []
            } else {
                //if geo doesnt have labels in the chosen language, fall back to english
                //this helps save space by not including labels in other languages that are spelt the same in english
                labelsArray = labels[map.geo_ + '_' + map.proj_]?.en || []
            }
        }
        //add country codes to labels array
        if (map.labelsToShow_.includes('cc')) {
            labelsArray = labelsArray.concat(labels[map.geo_ + '_' + map.proj_].cc)
        }

        //for statistical values we need to add centroids, then add values later
        if (map.labelsToShow_.includes('values')) {
            if (map._geom.nutsrg) {
                //values label shadows parent <g>
                const gsls = labelsG.append('g').attr('class', 'em-stat-labels-shadows').attr('text-anchor', 'middle')

                // values labels parent <g>
                const gsl = labelsG.append('g').attr('class', 'em-stat-labels').attr('text-anchor', 'middle')

                //allow for stat label positioning by adding a g element here, then adding the values in the mapType updateValuesLabels function
                let labelRegions
                if (map.nutsLevel_ == 'mixed') {
                    map._geom.mixed.rg0 = map._geom.nutsrg
                    map._geom.mixed.rg1 = feature(
                        out.Geometries.allNUTSGeoData[1],
                        out.Geometries.allNUTSGeoData[1].objects.nutsrg
                    ).features
                    map._geom.mixed.rg2 = feature(
                        out.Geometries.allNUTSGeoData[2],
                        out.Geometries.allNUTSGeoData[2].objects.nutsrg
                    ).features
                    map._geom.mixed.rg3 = feature(
                        out.Geometries.allNUTSGeoData[3],
                        out.Geometries.allNUTSGeoData[3].objects.nutsrg
                    ).features
                    labelRegions = map._geom.mixed.rg0.concat(map._geom.mixed.rg1, map._geom.mixed.rg2, map._geom.mixed.rg3)
                } else {
                    labelRegions = map._geom.nutsrg
                }

                // filter label regions for insets, e.g. only load MT for MT and avoid loading 2000 regions for every single inset
                if (map.geo_ !== 'EUR' && out.labelFilterFunction_) {
                    labelRegions = labelRegions.filter((rg) => out.labelFilterFunction_(rg, map))
                }

                // stats labels
                gsl.selectAll('g')
                    .data(labelRegions)
                    .enter()
                    .append('g')
                    .attr('transform', function (d) {
                        // use geographic names labels' positions for NUTS0
                        if (map.statLabelsPositions_[d.properties.id]) {
                            let pos = map._projection([
                                map.statLabelsPositions_[d.properties.id].x,
                                map.statLabelsPositions_[d.properties.id].y,
                            ])
                            let x = pos[0].toFixed(3)
                            let y = pos[1].toFixed(3)
                            return `translate(${x},${y})`
                        }
                        // otherwise calculate centroid
                        return 'translate(' + map._pathFunction.centroid(d) + ')'
                    })
                    .attr('class', 'em-stat-label')

                //SHADOWS
                if (map.labelShadow_) {
                    gsls.selectAll('g')
                        .data(labelRegions)
                        .enter()
                        .filter((d) => map.labelShadowsToShow_.includes('values'))
                        .append('g')
                        .attr('transform', function (d) {
                            // use geographic names labels' positions for NUTS0
                            if (map.statLabelsPositions_[d.properties.id]) {
                                let pos = map._projection([
                                    map.statLabelsPositions_[d.properties.id].x,
                                    map.statLabelsPositions_[d.properties.id].y,
                                ])
                                let x = pos[0].toFixed(3)
                                let y = pos[1].toFixed(3)
                                return `translate(${x},${y})`
                            }
                            // otherwise calculate centroid
                            return 'translate(' + map._pathFunction.centroid(d) + ')'
                        })

                        .attr('class', 'em-stat-label-shadow')
                }
            }
        }

        // rest of label types
        if (labelsArray) {
            let data = labelsArray.filter((d) => {
                if (d.class == 'countries') {
                    if (map.labelsToShow_.includes('countries')) {
                        return d
                    }
                }
                if (d.class == 'seas') {
                    if (map.labelsToShow_.includes('seas')) {
                        return d
                    }
                }
                if (d.class == 'cc') {
                    if (map.labelsToShow_.includes('cc')) {
                        return d
                    }
                }
            })

            //common styles between all label shadows
            const shadowg = labelsG.append('g').attr('class', 'em-label-shadows').attr('text-anchor', 'middle')

            //common styles between all labels
            const labelg = labelsG.append('g').attr('class', 'em-labels').attr('text-anchor', 'middle')

            //SHADOWS
            if (map.labelShadow_) {
                let shadows = shadowg
                    .selectAll('text')
                    .data(data)
                    .enter()
                    .append('text')
                    .attr('class', (d) => {
                        let classes = 'em-label-shadow-' + d.text.replace(/\s+/g, '-')
                        if (map.labelShadowsToShow_.includes(d.class)) {
                            classes += ' em-label-shadow-' + d.class
                        }
                        return classes
                    })
                    .filter((d) => map.labelShadowsToShow_.includes(d.class))
                    .attr('x', function (d) {
                        if (d.rotate) {
                            return 0 //for rotated text, x and y positions must be specified in the transform property
                        }
                        return map._projection([d.x, d.y])[0]
                    })
                    .attr('y', function (d) {
                        if (d.rotate) {
                            return 0 //for rotated text, x and y positions must be specified in the transform property
                        }
                        return map._projection([d.x, d.y])[1]
                    })
                    .attr('dy', -7) // set y position of bottom of text
                    .attr('transform', (d) => {
                        if (d.rotate) {
                            let pos = map._projection([d.x, d.y])
                            let x = pos[0]
                            let y = pos[1]
                            return `translate(${x},${y}) rotate(${d.rotate})`
                        } else {
                            return 'rotate(0)'
                        }
                    })
                    .text(function (d) {
                        return d.text
                    }) // define the text to display
            }

            //LABEL texts
            labelg
                .selectAll('text')
                .data(data)
                .enter()
                .append('text')
                .attr('class', (d) => {
                    let classes = 'em-label-' + d.text.replace(/\s+/g, '-')
                    if (map.labelsToShow_.includes(d.class)) {
                        classes += ' em-label-' + d.class
                    }
                    return classes
                })
                //position label
                .attr('x', function (d) {
                    if (d.rotate) {
                        return 0 //for rotated text, x and y positions must be specified in the transform property
                    }
                    return map._projection([d.x, d.y])[0]
                })
                .attr('y', function (d) {
                    if (d.rotate) {
                        return 0 //for rotated text, x and y positions must be specified in the transform property
                    }
                    return map._projection([d.x, d.y])[1]
                })
                .attr('dy', -7) // set y position of bottom of text
                //transform labels which have a "rotate" property in the labels config. For rotated labels, their X,Y must also be set in the transform.
                // note: dont apply to country code labels
                .attr('transform', (d) => {
                    if (d.rotate) {
                        let pos = map._projection([d.x, d.y])
                        let x = pos[0]
                        let y = pos[1]
                        return `translate(${x},${y}) rotate(${d.rotate})`
                    } else {
                        return 'rotate(0)'
                    }
                })
                .text(function (d) {
                    return d.text
                }) // define the text to display
        }
    }

    /**
     * @function addScalebarToMap
     * @description appends an SVG scalebar to the map. Uses pixelSize to calculate units in km
     */
    function addScalebarToMap() {
        let sb = out
            .svg()
            .append('svg')
            .attr('id', 'scalebar')
            .attr('x', out.scalebarPosition_[0])
            .attr('y', out.scalebarPosition_[1])

        let segmentHeight = out.scalebarSegmentHeight_

        // Julien's nice scalebars
        const marginLeft = 5
        const maxLengthPix = out.scalebarMaxWidth_
        const textOffsetX = out.scalebarTextOffset_[0]
        const textOffsetY = out.scalebarTextOffset_[1]
        const pixelSizeM = out.pixelSize_
        const maxLengthM = maxLengthPix * pixelSizeM
        const niceLengthM = niceScaleBarLength(maxLengthM)
        const niceLengthPixel = niceLengthM[0] / pixelSizeM
        const scaleBarStartDigit = niceLengthM[1]
        const subdivisionNbs = {
            1: 4,
            2: 2,
            5: 5,
        }

        const scalebarSVG = out
            .svg()
            .append('svg')
            .attr('class', 'em-scalebar')
            .attr('x', out.scalebarPosition_[0])
            .attr('y', out.scalebarPosition_[1])
            .attr('width', maxLengthPix + 20)
            .attr('height', out.scalebarHeight_)

        // top line full width
        scalebarSVG
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', marginLeft)
            .attr('y1', 1)
            .attr('x2', niceLengthPixel + marginLeft)
            .attr('y2', 1)

        //bottom line full width
        scalebarSVG
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', marginLeft)
            .attr('y1', out.scalebarSegmentHeight_)
            .attr('x2', niceLengthPixel + marginLeft)
            .attr('y2', out.scalebarSegmentHeight_)

        //first tick
        scalebarSVG
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', marginLeft)
            .attr('y1', 1)
            .attr('x2', marginLeft)
            .attr('y2', out.scalebarTickHeight_)

        scalebarSVG
            .append('text')
            .attr('class', 'em-scalebar-label')
            .attr('x', marginLeft + textOffsetX)
            .attr('y', out.scalebarTickHeight_ + textOffsetY)
            .text('0')

        //middle ticks
        const subdivisionNb = subdivisionNbs[scaleBarStartDigit]
        const divisionWidth = niceLengthPixel / subdivisionNb
        const divisionMinWidth = 15
        if (divisionWidth >= divisionMinWidth) {
            for (let i = 1; i < subdivisionNb; i++) {
                scalebarSVG
                    .append('line')
                    .attr('class', 'em-scalebar-line')
                    .attr('x1', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                    .attr('y1', 1)
                    .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                    .attr('y2', out.scalebarTickHeight_)
                scalebarSVG
                    .append('text')
                    .attr('class', 'em-scalebar-label')
                    .attr('x', marginLeft + textOffsetX + i * divisionWidth)
                    .attr('y', out.scalebarTickHeight_ + textOffsetY)
                    .text(getScalebarLabel((niceLengthM[0] / subdivisionNb) * i))
            }

            //every other segment mid-line
            for (let i = -1; i < subdivisionNb; i += 2) {
                if (i == 1) {
                    sb.append('line')
                        .attr('class', 'em-scalebar-line')
                        .attr('x1', marginLeft + out.scalebarStrokeWidth_ - 1)
                        .attr('y1', out.scalebarSegmentHeight_ / 2)
                        .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                        .attr('y2', out.scalebarSegmentHeight_ / 2)
                } else {
                    let x1 = marginLeft + out.scalebarStrokeWidth_ / 2 + (i - 1) * divisionWidth
                    if (x1 > 0) {
                        sb.append('line')
                            .attr('class', 'em-scalebar-line')
                            .attr('x1', x1)
                            .attr('y1', out.scalebarSegmentHeight_ / 2)
                            .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                            .attr('y2', out.scalebarSegmentHeight_ / 2)
                    }
                }
            }
        } else {
            // single full-length horizontal mid-line
            sb.append('line')
                .attr('class', 'em-scalebar-line')
                .attr('x1', marginLeft + out.scalebarStrokeWidth_ - 1)
                .attr('y1', out.scalebarSegmentHeight_ / 2)
                .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + divisionWidth * subdivisionNb)
                .attr('y2', out.scalebarSegmentHeight_ / 2)
        }

        //last tick
        scalebarSVG
            .append('line')
            .attr('class', 'em-scalebar-line')
            .attr('x1', niceLengthPixel + marginLeft)
            .attr('y1', 1)
            .attr('x2', niceLengthPixel + marginLeft)
            .attr('y2', out.scalebarTickHeight_)
        scalebarSVG
            .append('text')
            .attr('class', 'em-scalebar-label')
            .attr('x', niceLengthPixel + marginLeft + textOffsetX)
            .attr('y', out.scalebarTickHeight_ + textOffsetY)
            .text(getScalebarLabel(niceLengthM[0]) + out.scalebarUnits_)
    }

    function niceScaleBarLength(scaleBarLength) {
        //compute the 'nice' power of ten
        const pow10 = Math.pow(10, Math.floor(Math.log(scaleBarLength) / Math.log(10)))

        //check if 5 times this value fits
        if (5 * pow10 <= scaleBarLength) return [5 * pow10, 5]

        //check if 2 times this value fits
        if (2 * pow10 <= scaleBarLength) return [2 * pow10, 2]

        //returns the power of ten
        return [pow10, 1]
    }

    function getScalebarLabel(valueM) {
        if (valueM < 0.01) return valueM * 1000 + 'mm'
        if (valueM < 1) return valueM * 100 + 'cm'
        if (valueM < 1000) return valueM * 1 + 'm'
        return valueM / 1000
    }

    //format scalebar value
    function formatScalebarValue(x) {
        return Math.trunc(x)
        //round to nearest 5
        //return (x % 5) >= 2.5 ? Math.trunc(x / 5) * 5 + 5 : Math.trunc(x / 5) * 5;
    }

    /** Build template for inset, based on main one */
    const buildInset = function (config, map) {
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
        config.botTxtTooltipTxt = config.botTxtTooltipTxt || ''
        config.zoomExtent = config.zoomExtent || out.insetZoomExtent_
        config.width = config.width || out.insetBoxWidth_
        config.height = config.height || out.insetBoxWidth_
        config.insets = config.insets || []
        config.insetTemplates = config.insetTemplates || {}
        config.callback = config.callback || undefined

        //copy template attributes
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
            'labelling_',
            'labelFill_',
            'labelValuesFontSize_',
            'labelOpacity_',
            'labelStroke_',
            'labelStrokeWidth_',
            'labelShadowWidth_',
            'labelShadow_',
            'labelShadowColor_',
            'labelShadowsToShow_',
            'labelsToShow_',
            'fontFamily_',
            'lg_',
            'projectionFunction_',
            'filterGeometriesFunction_',
        ].forEach(function (att) {
            mt[att] = out[att]
        })

        //copy stat map attributes/methods
        ;[
            'stat',
            'statData',
            'legend',
            'legendObj',
            'noDataText',
            'language',
            'transitionDuration',
            'tooltip_',
            'classToText_',
        ].forEach(function (att) {
            mt[att] = out[att]
        })

        //apply config values for inset
        for (let key in config) mt[key + '_'] = config[key]

        mt.isInset = true // flag for inset-specific settings e.g. CSS class for titles
        return mt
    }

    return out
}

/** Default geocenter positions and pixelSize (for default width = 800px) for territories and projections. */
const _defaultPosition = {
    EUR_3035: { geoCenter: [4970000, 3350000], pixelSize: 6800 },
    IC_32628: { geoCenter: [443468, 3145647], pixelSize: 1000 },
    GP_32620: { geoCenter: [669498, 1784552], pixelSize: 130 },
    MQ_32620: { geoCenter: [716521, 1621322], pixelSize: 130 },
    GF_32622: { geoCenter: [266852, 444074], pixelSize: 500 },
    RE_32740: { geoCenter: [348011, 7661627], pixelSize: 130 },
    YT_32738: { geoCenter: [516549, 8583920], pixelSize: 70 },
    MT_3035: { geoCenter: [4719755, 1441701], pixelSize: 70 },
    PT20_32626: { geoCenter: [397418, 4271471], pixelSize: 1500 },
    PT30_32628: { geoCenter: [333586, 3622706], pixelSize: 150 },
    LI_3035: { geoCenter: [4287060, 2672000], pixelSize: 40 },
    IS_3035: { geoCenter: [3011804, 4960000], pixelSize: 700 },
    SJ_SV_3035: { geoCenter: [4570000, 6160156], pixelSize: 800 },
    SJ_JM_3035: { geoCenter: [3647762, 5408300], pixelSize: 100 },
    CARIB_32620: { geoCenter: [636345, 1669439], pixelSize: 500 },
    WORLD_54030: { geoCenter: [14, 17], pixelSize: 9000 },
}

/**
 * Default inset setting.
 * @param {*} s The width of the inset box
 * @param {*} p The padding
 */
const defaultInsetConfig = function (s, p) {
    const out = [
        { geo: 'IC', x: 0, y: 0, width: s, height: 0.3 * s, frameStroke: 'black' },
        { geo: 'CARIB', x: 0, y: 0.3 * s + p, width: 0.5 * s, height: s, frameStroke: 'black' },
        { geo: 'GF', x: 0.5 * s, y: 0.3 * s + p, width: 0.5 * s, height: 0.75 * s, frameStroke: 'black' },
        {
            geo: 'YT',
            x: 0.5 * s,
            y: 1.05 * s + p,
            width: 0.25 * s,
            height: 0.25 * s,
            frameStroke: 'black',
        },
        {
            geo: 'RE',
            x: 0.75 * s,
            y: 1.05 * s + p,
            width: 0.25 * s,
            height: 0.25 * s,
            frameStroke: 'black',
        },
        {
            geo: 'PT20',
            x: 0,
            y: 1.3 * s + 2 * p,
            width: 0.75 * s,
            height: 0.25 * s,
            frameStroke: 'black',
        },
        {
            geo: 'PT30',
            x: 0.75 * s,
            y: 1.3 * s + 2 * p,
            width: 0.25 * s,
            height: 0.25 * s,
            frameStroke: 'black',
        },
        { geo: 'MT', x: 0, y: 1.55 * s + 3 * p, width: 0.25 * s, height: 0.25 * s, frameStroke: 'black' },
        {
            geo: 'LI',
            x: 0.25 * s,
            y: 1.55 * s + 3 * p,
            width: 0.25 * s,
            height: 0.25 * s,
            frameStroke: 'black',
        },
        {
            geo: 'SJ_SV',
            x: 0.5 * s,
            y: 1.55 * s + 3 * p,
            width: 0.25 * s,
            height: 0.25 * s,
            frameStroke: 'black',
        },
        {
            geo: 'SJ_JM',
            x: 0.75 * s,
            y: 1.55 * s + 3 * p,
            width: 0.25 * s,
            height: 0.25 * s,
            frameStroke: 'black',
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

// convert rect attributes into an SVG path string
// used for workaround whereby clipPaths which use rect elements do not work in adobe illustrator
function convertRectangles(x, y, width, height) {
    var x = parseFloat(x, 10)
    var y = parseFloat(y, 10)
    var width = parseFloat(width, 10)
    var height = parseFloat(height, 10)

    if (x < 0 || y < 0 || width < 0 || height < 0) {
        return ''
    }

    return (
        'M' +
        x +
        ',' +
        y +
        'L' +
        (x + width) +
        ',' +
        y +
        ' ' +
        (x + width) +
        ',' +
        (y + height) +
        ' ' +
        x +
        ',' +
        (y + height) +
        'z'
    )
}
