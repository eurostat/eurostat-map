import { selectAll } from 'd3-selection'
import { executeForAllInsets } from './utils'
import { appendAnnotations } from './decoration/annotations'
import { addLabelsToMap } from './decoration/labels'
import { buildInsets, removeInsets } from './insets'
import { appendStamp } from './decoration/stamps'
import { buildGridCartogramBase } from './cartograms'
import { appendMinimap } from './minimaps'
import { defineMapZoom } from './zoom'
import { appendZoomButtons } from './buttons/zoom-buttons'
import { appendInsetsButton } from './buttons/insets-button'
import { appendLegendButton } from './buttons/legend-button'
import { addPlacenameLabels } from './decoration/placenames.js'
import { addEurostatLogo, addEurostatRibbon } from './decoration/logo.js'
import { appendCoastalMargin } from './decoration/coastal-margin.js'
import { addFootnote, addSourceLink, addSubtitle, addTitle } from './decoration/texts.js'
import { addScalebarToMap, updateScalebar } from './decoration/scalebar.js'
import { updateLocations } from './locations.js'
import { applyMapAccessibility, setupKeyboardNavigation } from './accessibility.js'
import { GEO_ERROR_MESSAGE, reportMapError, showMapErrorMessage } from './errors.js'
import { showEurostatApiErrorToast } from './toast.js'
import { createMapSVG, recalculateLayout, updateResponsiveMap, wrapMapSvg } from './layout'
import { defineDefaultPosition, definePathFunction, defineProjection, getDefaultZ } from './geo/projection'
import { addCentroidsToMap } from './geo/centroids'
import { BOX_CORNER_RADIUS } from './buttons/corner-radius'
import { isCompact, resolveContainerWidth } from './layout-profile'
import { DEFAULT_MAX_WIDTH } from './map-instance'

/**
 * Inset maps are rounded boxes (same radius as the legend and insets background). The frame stroke, the
 * sea and the clipPath rect that clips the inset's contents must all share the radius, otherwise the
 * contents poke out of the rounded frame. Attributes, not CSS, so SVG/PNG/HTML export keep them.
 */
const roundInsetCorners = (out) => (sel) => {
    if (out.isInset) sel.attr('rx', BOX_CORNER_RADIUS).attr('ry', BOX_CORNER_RADIUS)
}

/**
 * Builds the map's svg skeleton and, once the geometry is there, its contents.
 * @param {*} out the map
 * @param {boolean} withCenterPoints
 */
export const attachMapTemplate = function (out, withCenterPoints) {
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

        // how much room the container offers decides the layout profile, and the width unless it was set
        if (!out.isInset) {
            const containerWidth = resolveContainerWidth(out)
            if (containerWidth && !out._widthExplicit_) out.width_ = Math.min(DEFAULT_MAX_WIDTH, containerWidth)
        }
        svg.classed('em--compact', isCompact(out))

        //set SVG dimensions
        const requestedHeight = out._heightFn_ ? +out._heightFn_(out) : NaN
        if (requestedHeight > 0) {
            out.height_ = Math.max(150, requestedHeight)
        } else if (out._heightAuto_ || !out.height()) {
            // Computed from the width, and again on every build. A height put there any other way (the setter, or an inset's
            // config, which assigns height_ directly) is kept: _heightAuto_ is only set by this branch.
            // Get available height constrained to 99% of screen/container height
            const availableHeight = getAvailableHeight(out)
            const maxTotalHeight = 0.99 * availableHeight

            // Estimate header/footer/padding overhead to find maximum allowed map height
            const mobile = isCompact(out)
            const overhead = mobile ? (out.header_ ? 60 : 0) + (out.footnote_ ? 20 : 0) + 5 : (out.header_ ? 80 : 0) + (out.footnote_ ? 40 : 0) + 15
            const maxMapHeight = Math.max(150, maxTotalHeight - overhead)
            // the shape of the map follows its width, not the height of the screen: a compact map filling the window left bands of empty space
            let defaultHeight = (out.geo_.toUpperCase() === 'WORLD' ? 0.55 : mobile ? 1 : 0.85) * out.width()

            // a grid cartogram is as tall as its square cells need (about 11 rows for every 12 columns, plus the margins)
            if (out.gridCartogram_ && mobile) defaultHeight = (out.width() - 12) * 0.92 + 40
            if (defaultHeight > maxMapHeight) defaultHeight = maxMapHeight
            out.height_ = defaultHeight
            out._heightAuto_ = true
        }

        if (out.geo_.toUpperCase() == 'WORLD') {
            //WORLD geo only accepts proj 54030 (robinson) at the moment
            out.proj_ = 54030
        }
        svg.attr('width', out.width()).attr('height', out.height())
        updateResponsiveMap(out)

        // define clipPath relative to the drawing group (map area)
        const defs = svg.append('defs').attr('class', 'em-defs')

        defs.append('clipPath')
            .attr('id', out.svgId_ + '-clip-path')
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', out.width_)
            .attr('height', out.height_)
            .call(roundInsetCorners(out))

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
            .call(roundInsetCorners(out))

        if (out.stamp_) {
            appendStamp(out.stamp_, out)
        }

        applyMapAccessibility(out)

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

        // The initial scalebar draw in buildMapTemplateBase() can run before position_.z is
        // resolved here (it's only known once geo data has loaded, for maps without an explicit
        // z), leaving pixelSizeM undefined and baking NaN coordinates into the scalebar. Redraw it
        // now that position_.z is final, instead of waiting for a zoom event that may never come.
        updateScalebar(out)

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
        // On mobile, insets are hidden by default (see buildInsets in insets.js) to save space, so
        // auto-show the toggle button whenever insets exist and the user hasn't explicitly
        // configured insetsButton themselves - otherwise there would be no way to reveal them.
        {
            const isMobileForInsetsButton = isCompact(out, out.insetsVisibilityBreakpoint_)
            const hasInsets = Array.isArray(out.insets_) ? out.insets_.length > 0 : !!out.insets_
            if (out.insetsButton_ || (!out._insetsButtonExplicit_ && isMobileForInsetsButton && hasInsets)) {
                appendInsetsButton(out)
            }
        }

        // legend button
        if (out.legendButton_ && typeof out.legendObj_ !== 'undefined' && out.legendObj_) {
            appendLegendButton(out)
        }

        // after drawBackgroundMap, geometries, labels, etc.
        if (out.drawCoastalMargin_ && !out.gridCartogram_) {
            appendCoastalMargin(out)
        }

        applyMapAccessibility(out)
        setupKeyboardNavigation(out)

        //header/footer
        setTimeout(() => recalculateLayout(out), 20)
        return out
    }

    /**
     * Shows or hides the background map (sea, graticule, country/NUTS boundary geometry) on an
     * already-built map instance, without a full rebuild. Draws it on demand the first time it's
     * switched on if backgroundMap_ was false at build time (so it was never drawn), and always
     * lowers it to the back of the zoom group so z-order matches what buildMapTemplate() would
     * have produced. No-op for grid cartograms (backgroundMap_ is never drawn for those - see
     * buildMapTemplate()) and for insets (only applies to the map instance out is called on).
     */
    out.updateBackgroundMap = function () {
        if (out.gridCartogram_) return out

        const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
        const backgroundGroup = zoomGroup.select('.em-background-map-group')

        if (out.backgroundMap_) {
            if (backgroundGroup.empty()) {
                drawBackgroundMap(out)
            }
            zoomGroup.select('.em-background-map-group').lower()
        } else {
            backgroundGroup.remove()
        }

        return out
    }
}

const drawBackgroundMap = function (out) {
    //draw background map, wrapped in one group so it can be toggled/reordered as a unit by
    //updateBackgroundMap() without needing a full rebuild
    const zoomGroup = out.svg().select('#em-zoom-group-' + out.svgId_)
    const backgroundGroup = zoomGroup.append('g').attr('class', 'em-background-map-group')

    //draw sea
    backgroundGroup
        .append('rect')
        .attr('id', 'sea')
        .attr('class', 'em-sea')
        .call(roundInsetCorners(out))
        .attr('x', -5 * out.width_)
        .attr('y', -5 * out.height_)
        .attr('width', 11 * out.width_)
        .attr('height', 11 * out.height_)

    //sphere for world map
    if (out.geo_ == 'WORLD') {
        backgroundGroup.append('path').datum({ type: 'Sphere' }).attr('id', 'sphere').attr('d', out._pathFunction).attr('class', 'em-graticule')
    }

    // draw polygons and borders
    if (out.geometries_) {
        out.Geometries.addUserGeometriesToMap(out.geometries_, backgroundGroup, out._pathFunction)
    } else {
        out.Geometries.addDefaultGeometriesToMap(
            backgroundGroup,
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
export const updateGeoMapTemplate = function (callback, map, root = map) {
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
        let loaded = false // tells a failed download from an error while drawing
        map.Geometries.getDefaultGeoData(map.geo_, map.filterGeometriesFunction_, map.nutsLevel_)
            .then(() => {
                loaded = true
                map.buildMapTemplate()

                // Execute callback if defined
                if (callback) callback()
            })
            .catch((err) => {
                // A rejected fetch (network blip, rate limit, ...) must still run the callback -
                // otherwise the caller's loading counter (which drives the spinner overlay) never
                // decrements for this target and the spinner spins forever, even though every
                // other map/inset loaded fine. This map/inset just won't have geometry to draw.
                console.error(`[eurostat-map] Failed to load geo data for "${map.svgId_ || map.geo_}":`, err)
                if (loaded) {
                    reportMapError(root, { type: 'render', message: err?.message || String(err), cause: err })
                } else {
                    if (map === root) {
                        showMapErrorMessage(map)
                        showEurostatApiErrorToast(GEO_ERROR_MESSAGE)
                    }
                    reportMapError(root, { type: 'geometry', message: GEO_ERROR_MESSAGE, geo: map.geo_, cause: err })
                }
                if (callback) callback()
            })
    }

    // Use executeForAllInsets for recursive inset updates
    executeForAllInsets(map.insetTemplates_, map.svgId_, (inset) => {
        updateGeoMapTemplate(callback, inset, root)
    })

    return map
}

const getAvailableHeight = function (out) {
    let availableHeight = typeof window !== 'undefined' ? window.innerHeight : 800

    if (typeof document !== 'undefined') {
        const svgId = out.svgId()
        const containerId = out.containerId_

        let container = null
        // Only use containerId_ when explicitly set and different from the SVG ID.
        // This avoids constraining height to a parent wrapper with auto height
        // (often just the browser's default intrinsic SVG height).
        if (containerId && containerId !== svgId) {
            container = document.getElementById(containerId)
        }

        if (container && container !== document.body && container !== document.documentElement) {
            // Ensure the container is not the SVG element or wrapper itself
            const tagName = container.tagName?.toLowerCase()
            const isMapElement = tagName === 'svg' || container.classList?.contains('em-map-wrapper') || container.classList?.contains('em-map')

            if (!isMapElement) {
                const containerHeight = container.clientHeight
                if (containerHeight > 0) {
                    availableHeight = Math.min(availableHeight, containerHeight)
                }
            }
        }
    }
    return availableHeight
}
