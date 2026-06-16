import { select, selectAll } from 'd3-selection'
import { getBBOXAsGeoJSON, executeForAllInsets, getParameterByName, getApproxCurrentGeoBbox } from './utils'
import { appendAnnotations } from './decoration/annotations'
import { addLabelsToMap, updateLabels, updateValuesLabels } from './decoration/labels'
import { defineDeprecatedFunctions } from './deprecated'
import { Geometries } from './geo/geometries'
import { buildInsets, removeInsets } from './insets'
import { appendStamp } from './decoration/stamps'
import { buildGridCartogramBase } from './cartograms'
import { appendMinimap } from './minimaps'
import { defineMapZoom, setMapView } from './zoom'
import { appendZoomButtons } from './buttons/zoom-buttons'
import { appendInsetsButton } from './buttons/insets-button'
import { appendLegendButton } from './buttons/legend-button'
import { addPlacenameLabels } from './decoration/placenames.js'
import { initProj4 } from './geo/proj4.js'
import { addEurostatLogo, addEurostatRibbon } from './decoration/logo.js'
import { appendCoastalMargin } from './decoration/coastal-margin.js'
import { addFootnote, addSourceLink, addSubtitle, addTitle } from './decoration/texts.js'
import { addScalebarToMap, getDefaultScalebarConfig } from './decoration/scalebar.js'
import { attachLocationsApi } from './locations.js'
import { createMapSVG, recalculateLayout, wrapMapSvg } from './layout'
import { defineDefaultPosition, definePathFunction, defineProjection, getDefaultZ } from './geo/projection'
import { addCentroidsToMap } from './geo/centroids'

//types
/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */

/**
 * @param {import('../types/core/MapConfig').MapConfig} config
 * @param {boolean} withCenterPoints
 * @param {string} mapType
 * @returns {MapInstance}
 */
export const createMapInstance = function (config, withCenterPoints, mapType) {
    //build map template object
    const out = {}
    out._mapType = mapType
    out.isInset_ = false

    // expose imported function to other modules
    out.updateValuesLabels = updateValuesLabels

    //map
    out.svgId_ = 'map'
    out.svg_ = undefined
    out.width_ = Math.min(795, window.innerWidth)
    out.height_ = 0
    out.containerId_ = undefined

    //geographical focus
    out.nutsLevel_ = 3 // 0,1,2,3, or 'mixed'
    out.nutsYear_ = 2024
    out.geo_ = 'EUR' //NUTS2JSON geo (e.g. 'EUR', 'PT', 'WORLD', etc.) See
    out.proj_ = '3035'
    out.projectionFunction_ = undefined // e.g. d3.geoRobinson()
    out.filterGeometriesFunction_ = undefined // user defined filter function
    out.scale_ = '20M' //TODO choose automatically?
    out.position_ = { x: undefined, y: undefined, z: undefined } // initial map view
    out.placenames_ = false // load placenames from placenames.js
    out.placenamesFilter_ = undefined // function to filter placenames

    //cartograms
    out.gridCartogram_ = false // draw geometries as grid cells
    out.gridCartogramSettings_ = {
        shape: 'square', // square or hexagon
        margins: { top: 80, right: 50, bottom: 80, left: 150 },
        cellPadding: 4,
        positions: undefined, // user defined cartograms
    }

    // pan & zoom
    out.zoomExtent_ = undefined
    out.translateExtent_ = undefined //d3 zoom.translateExtent
    out.lockPanUntilZoom_ = true // if true, user can pan only after zooming once

    //events
    out.onZoomEnd_ = undefined // user function to call when zoom ends
    out.onZoom_ = undefined // user function to call when zooming
    out.onRegionMouseOver_ = undefined // user function to call when mouseover a region
    out.onRegionMouseMove_ = undefined // user function to call when mousemove over a region
    out.onRegionMouseOut_ = undefined // user function to call when mouseout of a region
    out.onRegionClick_ = undefined // user function to call when clicking a region

    // geometries
    out.geometries_ = undefined // [{id:String, data:geojson, class:function}] user-defined geometries
    out.processCentroids_ = undefined // runs over symbol centroids

    //dorling cartograms (used for ps and pie maps)
    out.dorling_ = false
    out.dorlingSettings_ = {
        animate: true,
        strength: { x: 1, y: 1 },
        iterations: 1,
        padding: 0,
        onProgress: undefined,
        worker: false, // use a web worker for (non-animated) dorling cartograms to not block the main thread
        workerD3URL: undefined,
    }

    //header/footer
    out.header_ = false // add titles to separate header section
    out.footer_ = false // add footnotes to separate footer section
    out.footerPadding_ = undefined // px padding between map and footer
    out.headerPadding_ = undefined // px padding between header and map

    //map title
    out.title_ = ''
    out.titlePosition_ = undefined

    //map subtitle
    out.subtitle_ = ''
    out.subtitlePosition_ = undefined

    //scalebar
    out.scalebar_ = null // null = disabled

    // stamp annotation
    out.stamp_ = undefined //e.g {x,y,text,size}

    //minimap
    out.minimap_ = undefined

    //buttons
    out.zoomButtons_ = true // show zoom buttons
    out.zoomButtonsPosition_ = undefined // [x,y] position of zoom buttons. If not specified, they are positioned in the top right corner
    out.insetsButton_ = false // show insets button
    out.insetsButtonPosition_ = undefined // [x,y] position of insets button. If not specified, they are positioned in the top right corner
    out.legendButton_ = false // show legend toggle button
    out.legendButtonPosition_ = undefined // [x,y] position of legend button. If not specified, they are positioned in the top left corner
    out.legendVisible_ = undefined // legend visibility state (initialized in stat-map when legendButton is enabled)

    //tooltip
    out.tooltip_ = {
        fontSize: '14px',
        transitionDuration: 200,
        xOffset: 0,
        yOffset: 0,
        textFunction: null,
        showFlags: false,
        omitRegions: [], // if specified, tooltip will not work for these regions
    } //  See tooltip.js for more details

    // region mouseover color
    out.hoverColor_ = 'red'

    //coastal margin
    out.drawCoastalMargin_ = false
    // for color, see .em-coastal-margin in map.css
    out.coastalMarginSettings_ = {
        standardDeviation: 0.8, // Softer blur
        x: '-50%',
        y: '-50%',
        width: '150%',
        height: '150%',
        strokeWidth: 0.6, // Thin, subtle line
        color: 'rgb(0, 0, 0)',
        opacity: 0.1, // Very subtle
    }

    //graticule
    out.drawGraticule_ = false

    //background map toggle (e.g. for dorling)
    out.backgroundMap_ = true

    //labelling
    // see docs\reference.md#labelling
    out.labels_ = undefined

    //annotations
    out.annotations_ = undefined
    out.annotationsAdded = false //simple flag to know when annotations have already been added

    //hatching
    out.patternFill_ = undefined // e.g. {pattern:'hatching',regionIds:['DE','FR']}

    //dataset source link
    out.showSourceLink_ = true

    //default copyright and disclaimer text
    out.defaultFootnote_ = 'Administrative boundaries: \u00A9EuroGeographics \u00A9OpenStreetMap'
    out.defaultFootnoteTooltipText_ =
        '<div class="em-footnote-tooltip">The designations employed and the presentation of material on this map do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence.</div>'
    out.footnote_ = out.defaultFootnote_ //"(C)EuroGeographics (C)UN-FAO (C)Turkstat";
    out.footnoteTooltipText_ = out.defaultFootnoteTooltipText_
    out.footnoteWrap_ = false //number of characters at which the footnote is wrapped
    out.footnotePosition_ = undefined

    out.showEstatLogo_ = false
    out.showEstatRibbon_ = false
    out.logoPosition_ = undefined
    out.ribbonPosition_ = undefined
    out.ribbonWidth_ = undefined
    out.ribbonHeight_ = undefined
    out.logoWidth_ = undefined
    out.logoHeight_ = undefined
    out.nuts2jsonBaseURL_ = window.location.hostname.includes('ec.europa.eu')
        ? 'https://ec.europa.eu/eurostat/cache/GISCO/pub/nuts2json/v2/'
        : 'https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/v2'

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

    out.isInset = config?.isInset || false

    // warn existing users of functions that have been banished to the shadow realm.
    defineDeprecatedFunctions(out)

    // convert geo to uppercase
    out.geo = function (v) {
        if (!arguments.length) return out.geo_
        out.geo_ = v.toUpperCase()
        return out
    }

    //special ones which affect also the insets
    ;['tooltip_', 'nuts2jsonBaseURL_', 'processCentroids_', 'coastalMarginSettings_'].forEach(function (att) {
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

    // grid cartogram settings getter/setter
    out.gridCartogramSettings = function (v) {
        if (!arguments.length) return out.gridCartogramSettings_

        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            const next = Object.assign({}, out.gridCartogramSettings_, v)
            if (v.margins && typeof v.margins === 'object') {
                next.margins = Object.assign({}, out.gridCartogramSettings_.margins, v.margins)
            }
            const labelSettings = Object.assign(
                {},
                out.gridCartogramSettings_?.countryLabelSettings || {},
                v.countryLabelSettings || {}
            )
            ;['countryLabels', 'countryLabelFontSize', 'countryLabelMinFontSize', 'countryLabelPadding', 'countryLabelAvoidOverlap'].forEach(
                (key) => {
                    if (v[key] !== undefined) labelSettings[key] = v[key]
                }
            )
            if (Object.keys(labelSettings).length) {
                next.countryLabelSettings = labelSettings
            }
            out.gridCartogramSettings_ = next
        } else {
            out.gridCartogramSettings_ = v
        }
        return out
    }

    // dorling settings getter/setter
    out.dorlingSettings = function (v) {
        if (!arguments.length) return out.dorlingSettings_

        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            const next = Object.assign({}, out.dorlingSettings_, v)
            if (v.strength && typeof v.strength === 'object') {
                next.strength = Object.assign({}, out.dorlingSettings_.strength, v.strength)
            }
            out.dorlingSettings_ = next
        } else {
            out.dorlingSettings_ = v
        }
        return out
    }

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

    out.scalebar = function (v) {
        if (!arguments.length) return out.scalebar_

        if (v === false) {
            out.scalebar_ = null
            return out
        }

        if (v === true) {
            out.scalebar_ = out.scalebar_ || getDefaultScalebarConfig()
            return out
        }

        if (typeof v === 'object' && v !== null) {
            out.scalebar_ = Object.assign({}, getDefaultScalebarConfig(), out.scalebar_ || {}, v)
            return out
        }

        return out
    }

    //coastal margin override
    out.drawCoastalMargin = function (v) {
        //get
        if (!arguments.length) return out.drawCoastalMargin_
        //set
        out.drawCoastalMargin_ = v
        //update
        appendCoastalMargin(out)
        return out
    }

    //annotations override (update after first call)
    out.annotations = function (v) {
        //get
        if (!arguments.length) return out.annotations_
        //set
        out.annotations_ = v
        //update
        appendAnnotations(out)
        return out
    }

    //stamps override (update after first call)
    out.stamp = function (v) {
        //get
        if (!arguments.length) return out.stamp_
        //set
        out.stamp_ = v
        //update
        appendStamp(out.stamp_, out)
        return out
    }

    //minimap override (update after first call)
    out.minimap = function (v) {
        //get
        if (!arguments.length) return out.minimap_
        //set
        out.minimap_ = v
        //update
        appendMinimap(out)
        return out
    }

    //labels override (update after first call)
    out.labels = function (v) {
        //get
        if (!arguments.length) return out.labels_
        //set
        out.labels_ = v
        // DEFAULT: scaleOnZoom = true
        if (out.labels_ && out.labels_?.scaleOnZoom === undefined) {
            out.labels_.scaleOnZoom = true
        }
        //update
        updateLabels(out)
        return out
    }

    out.position = function (v) {
        if (!arguments.length) return out.position_
        out.position_ = v
        setMapView(out, v)
        return out
    }

    // initiate Geometries class
    out.Geometries = Geometries(out, withCenterPoints)

    attachLocationsApi(out)

    /**
     * Build a map object, including container, frame, map svg, insets and d3 zoom
     */
    out.buildMapTemplateBase = function () {
        const svg = createMapSVG(out)
        out.svg_ = svg

        // Wrap SVG so HTML overlays (spinner, tooltip) can sit above it
        if (!out.isInset) {
            out._wrapper_ = wrapMapSvg(svg)
        }

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

        // define clipPath relative to the drawing group (map area)
        const defs = svg.append('defs').attr('class', 'em-defs')

        defs.append('clipPath')
            .attr('id', out.svgId_ + '-clip-path')
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', out.width_)
            .attr('height', out.height_)

        if (out.drawCoastalMargin_) {
            //define filter for coastal margin
            svg.append('filter')
                .attr('id', 'em-coastal-blur')
                .attr('x', out.coastalMarginSettings_.x)
                .attr('y', out.coastalMarginSettings_.y)
                .attr('width', out.coastalMarginSettings_.width)
                .attr('height', out.coastalMarginSettings_.height)
                .append('feGaussianBlur')
                .attr('in', 'SourceGraphic')
                .attr('stdDeviation', out.coastalMarginSettings_.standardDeviation)
        }

        // create header, drawing and footer groups (stacked blocks)
        // header (top)
        svg.append('g')
            .attr('id', 'em-header-' + out.svgId_)
            .attr('class', 'em-header')

        // drawing group (middle). clip-path will be updated by recalculateLayout()
        const dg = svg
            .append('g')
            .attr('id', 'em-drawing-' + out.svgId_)
            .attr('class', 'em-drawing-group')
            .attr('clip-path', `url(#${out.svgId_}-clip-path)`) //  apply clipPath here

        //add draggable class to map svg
        if (out.zoomExtent_ || out.zoomButtons_) {
            dg.classed('em-draggable', true)
        }

        // main zoom group inside drawing
        const zg = dg
            .append('g')
            .attr('id', 'em-zoom-group-' + out.svgId_)
            .attr('class', 'em-zoom-group')

        // footer (bottom)
        svg.append('g')
            .attr('id', 'em-footer-' + out.svgId_)
            .attr('class', 'em-footer')

        // build insets
        removeInsets(out) //remove existing
        buildInsets(out, withCenterPoints, out._mapType) //build new

        //draw frame
        dg.append('rect')
            .attr('id', 'em-frame-' + out.geo_)
            .attr('class', 'em-frame')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', out.width_)
            .attr('height', out.height_)

        if (out.stamp_) {
            appendStamp(out.stamp_, out)
        }

        return out
    }

    /**
     * Buid an empty map template, based on the geometries only.
     */
    out.buildMapTemplate = function () {
        //prepare drawing group
        const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
        //remove all children
        zoomGroup.selectAll('*').remove()

        // separate logic for cartograms
        if (out.gridCartogram_ == true) {
            buildGridCartogramBase(out)
            if (out.footnote_ == out.defaultFootnote_) out.footnote_ = false //dont need copyright for grid cartograms
            if (out.footnoteTooltipText_ == out.defaultFootnoteTooltipText_) out.footnoteTooltipText_ = false
        } else {
            // default geographic logic

            // position
            if (!out.position_.x || !out.position_.y) {
                defineDefaultPosition(out)
            }
            out.position_.z = out.position_.z || getDefaultZ(out)

            // d3 projection/path functions
            defineProjection(out)
            definePathFunction(out)

            if (out.backgroundMap_) {
                drawBackgroundMap(out)
            }
        }

        // d3 zoom
        if (out.zoomExtent_ || out.zoomButtons_) {
            if (!out.zoomExtent_) {
                out.zoomExtent_ = [1, 10]
            }
            defineMapZoom(out)
        }

        // prepare group for proportional symbols, with centroids
        // IMPORTANT: Skip for grid cartograms - they use grid cells as anchors instead
        if (withCenterPoints && !out.gridCartogram_) {
            addCentroidsToMap(out)
        }

        // add user locations (points)
        if (out._locations_?.length) updateLocations(out)

        // add geographical labels to map
        if (out.labels_ && !out.gridCartogram_) {
            addLabelsToMap(out, zoomGroup)
        }

        //annotations
        if (out.annotations_) {
            appendAnnotations(out)
            out.annotationsAdded = true
        }

        //placenames
        if (out.placenames_ && !out.gridCartogram_) {
            addPlacenameLabels(out)
        }

        //title
        if (out.title()) {
            addTitle(out)
        }

        //subtitle
        if (out.subtitle()) {
            addSubtitle(out)
        }

        //bottom text
        if (out.footnote_) {
            addFootnote(out)
        }

        //logo
        if (out.showEstatLogo_) {
            addEurostatLogo(out)
        }

        if (out.showEstatRibbon_) {
            addEurostatRibbon(out)
        }

        //source dataset URL
        if (out.showSourceLink_) {
            addSourceLink(out, withCenterPoints)
        }

        // scalebar - not applicable for grid cartograms
        if (out.scalebar_ && !out.gridCartogram_) {
            const sb = out.scalebar_

            if (!sb.position || sb.position.length !== 2) {
                sb.position = [15, out.height_ - 50]
            }

            addScalebarToMap(out)
        }

        //minimap
        if (out.minimap_) {
            appendMinimap(out)
        }

        //zoom buttons
        if (out.zoomButtons_ && !out.gridCartogram_) {
            appendZoomButtons(out)
        }

        //insets buttons
        if (out.insetsButton_) {
            appendInsetsButton(out)
        }

        // legend button
        if (out.legendButton_ && typeof out.legendObj_ !== 'undefined' && out.legendObj_) {
            appendLegendButton(out)
        }

        // after drawBackgroundMap, geometries, labels, etc.
        if (out.drawCoastalMargin_ && !out.gridCartogram_) {
            appendCoastalMargin(out)
        }

        //header/footer
        setTimeout(() => recalculateLayout(out), 20)
        return out
    }

    return out
}

const drawBackgroundMap = function (out) {
    //draw background map
    const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
    //draw sea
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
        zoomGroup.append('path').datum({ type: 'Sphere' }).attr('id', 'sphere').attr('d', out._pathFunction).attr('class', 'em-graticule')
    }

    // draw polygons and borders
    if (out.geometries_) {
        out.Geometries.addUserGeometriesToMap(out.geometries_, zoomGroup, out._pathFunction)
    } else {
        out.Geometries.addDefaultGeometriesToMap(
            zoomGroup,
            out.drawGraticule_,
            out._pathFunction,
            out.nutsLevel_,
            out.nutsYear_,
            out.geo_,
            out.proj_,
            out.scale_
        )
    }
}

/**
 * Requests geographic data and then builds the map template
 */
export const updateGeoMapTemplate = function (callback, map) {
    if (!callback) console.warn('⚠️ map.updateGeoMapTemplate called without callback function!')
    // Erase previous data
    map.Geometries.defaultGeoData = null
    map.Geometries.allNUTSGeoData = null
    map.Geometries.centroidsData = null

    if (map.geometries_) {
        map.Geometries.setUserGeometries(map.geometries_)
        // use custom user-defined geometries
        map.buildMapTemplate()

        // Execute callback if defined
        if (callback) callback()
    } else {
        // use default
        map.Geometries.getDefaultGeoData(map.geo_, map.filterGeometriesFunction_, map.nutsLevel_).then(() => {
            map.buildMapTemplate()

            // Execute callback if defined
            if (callback) callback()
        })
    }

    // Use executeForAllInsets for recursive inset updates
    executeForAllInsets(map.insetTemplates_, map.svgId_, (inset) => {
        updateGeoMapTemplate(callback, inset)
    })

    return map
}
