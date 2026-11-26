import { executeForAllInsets } from './utils'
import { appendAnnotations } from './decoration/annotations'
import { updateLabels, updateValuesLabels } from './decoration/labels'
import { defineDeprecatedFunctions } from './deprecated'
import { Geometries } from './geo/geometries'
import { appendStamp } from './decoration/stamps'
import { appendMinimap } from './minimaps'
import { setMapView, zoomMapTo } from './zoom'
import { appendCoastalMargin } from './decoration/coastal-margin.js'
import { getDefaultScalebarConfig, mergeScalebarConfig } from './decoration/scalebar.js'
import { attachLocationsApi } from './locations.js'
import { applyMapAccessibility, setupKeyboardNavigation, setupLegendNavigation } from './accessibility.js'
import { applyBorderModeClasses, updateResponsiveMap } from './layout'
import { DEFAULT_FIT_ZOOM } from './geo/projection'
import { attachMapTemplate } from './map-template'

//types
/** @typedef {import('../types/core/MapInstance').MapInstance} MapInstance */

/**
 * @param {import('../types/core/MapConfig').MapConfig} config
 * @param {boolean} withCenterPoints
 * @param {string} mapType
 * @returns {MapInstance}
 */
/** Widest a map gets by default (px), when its container offers more. */
export const DEFAULT_MAX_WIDTH = 795

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
    out.width_ = Math.min(DEFAULT_MAX_WIDTH, window.innerWidth)
    out.height_ = 0
    out.containerId_ = undefined
    out.responsive_ = true // scale the svg down to fit its container (viewBox)
    // accessibility (see accessibility.js)
    out.ariaLabel_ = undefined // accessible name of the map; the title and subtitle when unset
    out.ariaDescription_ = undefined // longer description for screen readers, written as the svg's <desc>
    out.keyboardNavigation_ = true // arrow keys move between regions
    // How the layout adapts to the room the map has (see layout-profile.js): 'auto' follows the width of the
    // map's container (a small iframe is as compact as a phone), 'desktop' and 'compact' fix the profile.
    out.layout_ = 'auto'
    // 'below' (default): in the compact layout the legends sit under the map, wherever they were placed on a wide one;
    // 'keep': they stay where legend() puts them
    out.legendCompactPosition_ = 'below'

    //geographical focus
    out.nutsLevel_ = 3 // 0,1,2,3, or 'mixed'
    out.nutsYear_ = 2024
    out.geo_ = 'EUR' //NUTS2JSON geo (e.g. 'EUR', 'PT', 'WORLD', etc.) See
    out.proj_ = '3035'
    out.projectionFunction_ = undefined // e.g. d3.geoRobinson()
    out.filterGeometriesFunction_ = undefined // user defined filter function
    // Divides the exact bbox-fit pixel size when z is not set explicitly, so the default
    // view is zoomed in a bit tighter than an exact fit (which tends to look too zoomed out).
    // Higher = more zoomed in by default; 1 = exact fit.
    out.defaultFitZoom_ = DEFAULT_FIT_ZOOM
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
        chartOffset: { x: 0, y: 0 },
        positions: undefined, // user defined cartograms

        // labelling settings for grid cartograms
        countryLabels: undefined,
        countryLabelFontSize: undefined,
        countryLabelMinFontSize: undefined,
        countryLabelPadding: { x: 0, y: 0 },
        countryLabelAvoidOverlap: false,
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
    out._insetsButtonExplicit_ = false // true once the user has explicitly called insetsButton(v)
    out.insetsButtonPosition_ = undefined // [x,y] position of insets button. If not specified, they are positioned in the top right corner
    out.insetsVisibilityBreakpoint_ = 480 // container width (px) at/below which insets start hidden (behind the insets button) unless insetsButton was set explicitly. See isMobile checks in insets.js and appendInsetsButton's caller in map-instance.js.
    out.legendButton_ = false // show legend toggle button
    out.legendButtonPosition_ = undefined // [x,y] position of legend button. If not specified, they are positioned in the top left corner
    out.legendVisible_ = undefined // legend visibility state (initialized in stat-map when legendButton is enabled)
    out.legendVisibilityBreakpoint_ = 480 // container width (px) at/below which the legend starts hidden (behind the legend button) when legendButton is enabled. See getDefaultLegendVisible() in stat-map.js.

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

    //border modes: CSS modifier classes on the map svg, see css/border-modes.css and docs/css.md
    out.lightBorders_ = false // white national, Kosovo, regional and disputed borders, no halo (em--borders-light)
    out.darkMode_ = false // dark sea and land, with borders adjusted to them (em--dark)

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

    // Default credits label and disclaimer text
    out.defaultFootnote_ = 'Credits'
    out.defaultFootnoteTooltipText_ =
        '<div class="em-footnote-tooltip">The designations employed and the presentation of material on this map do not imply the expression of any opinion whatsoever on the part of the European Union concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Kosovo*: This designation is without prejudice to positions on status, and is in line with UNSCR 1244/1999 and the ICJ Opinion on the Kosovo declaration of independence.</div>'
    out.footnote_ = out.defaultFootnote_
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
    //URL of the world boundaries topojson used by geo('WORLD') maps. Not part of Nuts2json (a
    //separate, bundled eurostat-map asset), so it isn't derived from nuts2jsonBaseURL_.
    out.worldTopojsonURL_ = window.location.hostname.includes('ec.europa.eu')
        ? 'https://ec.europa.eu/assets/estat/E/E4/gisco/IMAGE/WORLD_4326.json'
        : 'https://raw.githubusercontent.com/eurostat/eurostat-map/master/src/assets/topojson/WORLD_4326.json'

    //style for no data regions
    out.noDataFillStyle_ = '#ADADAD'

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

    // a width set by the caller is kept as it is; otherwise it follows the container (see buildMapTemplateBase)
    const setWidth = out.width
    out.width = function (v) {
        if (arguments.length) out._widthExplicit_ = true
        return setWidth.apply(out, arguments)
    }

    const setHeight = out.height
    out.height = function (v) {
        // a function is asked for the height at every build, e.g. to fill the window: height(() => innerHeight - 60)
        if (typeof v === 'function') {
            out._heightFn_ = v
            out._heightAuto_ = true
            return out
        }
        if (arguments.length) {
            out._heightAuto_ = false
            out._heightFn_ = undefined
        }
        return setHeight.apply(out, arguments)
    }

    out.isInset = config?.isInset || false

    // accessibility settings also apply to an already-built map
    ;['ariaLabel', 'ariaDescription', 'keyboardNavigation'].forEach(function (name) {
        out[name] = function (v) {
            if (!arguments.length) return out[name + '_']
            out[name + '_'] = v
            if (out.svg_) {
                applyMapAccessibility(out)
                if (name === 'keyboardNavigation') {
                    setupKeyboardNavigation(out)
                    out.layers_?.forEach((layer) => layer.legendObj_ && setupLegendNavigation(layer.legendObj_))
                }
            }
            return out
        }
    })

    // warn existing users of functions that have been banished to the shadow realm.
    defineDeprecatedFunctions(out)

    // convert geo to uppercase
    out.geo = function (v) {
        if (!arguments.length) return out.geo_
        out.geo_ = v.toUpperCase()
        return out
    }

    out.responsive = function (v) {
        if (!arguments.length) return out.responsive_
        out.responsive_ = !!v
        updateResponsiveMap(out)
        return out
    }

    //special ones which affect also the insets
    ;['tooltip_', 'nuts2jsonBaseURL_', 'worldTopojsonURL_', 'processCentroids_', 'coastalMarginSettings_'].forEach(function (att) {
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

    // border modes: also set on every inset, and applied at once to an already-built map
    ;['lightBorders_', 'darkMode_'].forEach(function (att) {
        const name = att.substring(0, att.length - 1)
        out[name] = function (v) {
            if (!arguments.length) return out[att]
            out[att] = !!v
            if (out.insetTemplates_) executeForAllInsets(out.insetTemplates_, out.svgId_, (inset) => inset[name](out[att]))
            applyBorderModeClasses(out, true)
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
            const labelSettings = Object.assign({}, out.gridCartogramSettings_?.countryLabelSettings || {}, v.countryLabelSettings || {})
            ;['countryLabels', 'countryLabelFontSize', 'countryLabelMinFontSize', 'countryLabelPadding', 'countryLabelAvoidOverlap'].forEach(
                (key) => {
                    if (v[key] !== undefined) labelSettings[key] = v[key]
                }
            )
            if (Object.keys(labelSettings).length) {
                next.countryLabelSettings = labelSettings
            }
            if (v.chartOffset && typeof v.chartOffset === 'object') {
                next.chartOffset = Object.assign({}, out.gridCartogramSettings_.chartOffset, v.chartOffset)
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
    const insetPresetNames = ['default', 'image', 'eu', 'euEfta']
    out.insets = function () {
        if (!arguments.length) return out.insets_
        if (arguments.length == 1 && insetPresetNames.includes(arguments[0])) out.insets_ = arguments[0]
        else if (arguments.length == 1 && arguments[0] === true) out.insets_ = 'default'
        else if (arguments.length == 1 && arguments[0] === false) out.insets_ = false
        else if (arguments.length == 1 && Array.isArray(arguments[0])) out.insets_ = arguments[0]
        else out.insets_ = arguments
        return out
    }

    // insets button getter/setter
    out.insetsButton = function (v) {
        if (!arguments.length) return out.insetsButton_
        out.insetsButton_ = v
        out._insetsButtonExplicit_ = true

        // If the insets toggle button is enabled but no insets were configured,
        // default to the standard inset set so the button always has content to toggle.
        if (v === true && (out.insets_ === undefined || (Array.isArray(out.insets_) && out.insets_.length === 0))) {
            out.insets_ = 'default'
        }

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
            // mergeScalebarConfig (not a raw Object.assign) so a `v` built with `a ?? b` fallback
            // chains can't clobber existing/default values via explicitly-undefined keys.
            out.scalebar_ = mergeScalebarConfig(v, mergeScalebarConfig(out.scalebar_))
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
        if (out.labels_ && typeof out.labels_ === 'object') {
            out.labels_ = { ...out.labels_ }
            if (out.labels_.halos === undefined && out.labels_.shadows !== undefined) {
                out.labels_.halos = out.labels_.shadows
            }
        }
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

    out.zoomTo = function (pos, options) {
        zoomMapTo(out, pos, options)
        return out
    }

    // initiate Geometries class
    out.Geometries = Geometries(out, withCenterPoints)

    attachLocationsApi(out)

    attachMapTemplate(out, withCenterPoints)

    return out
}

export { updateGeoMapTemplate } from './map-template'
