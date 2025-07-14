import { zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'
import { getCurrentBbox } from './utils'

export const defineMapZoom = function (map) {
    let svg = select('#' + map.svgId())
    let previousT = zoomIdentity
    map.__zoomBehavior = zoom()
        .filter(function (event) {
            // Prevent zoom if interacting with a zoom button
            const target = event.target
            return !target.closest('.em-zoom-buttons') && !target.closest('.em-button')
        })
        .scaleExtent(map.zoomExtent())
        .on('zoom', function (e) {
            const t = e.transform
            const zoomGroup = map.svg_.select('#em-zoom-group-' + map.svgId_)

            if (t.k !== previousT.k) {
                zoomHandler(e, previousT, map)
                //  Store zoom level (k) in the DOM (e.g. to be used in mouseover events)
                zoomGroup.attr('data-zoom', t.k)
            } else {
                panHandler(e, map)
            }

            // apply default transform to map
            zoomGroup.attr('transform', t)
            previousT = t
        })
        .on('end', function (e) {
            if (map.onZoomEnd_) {
                map.onZoomEnd_(e, map)
            }
        })

    svg.call(map.__zoomBehavior)
}

// Pan handler function
const panHandler = function (event, map) {
    const transform = event.transform

    // Compute the projected center
    const centerX = (map.width_ / 2 - transform.x) / transform.k
    const centerY = (map.height_ / 2 - transform.y) / transform.k
    let [geoX, geoY] = map._projection.invert([centerX, centerY])

    // Clamp geoX and geoY to max bounds and adjust the event transform
    if (map.maxBounds_.xMin !== undefined && geoX < map.maxBounds_.xMin) {
        geoX = map.maxBounds_.xMin
        transform.x = map.width_ / 2 - map._projection([geoX, geoY])[0] * transform.k
    }
    if (map.maxBounds_.yMin !== undefined && geoY < map.maxBounds_.yMin) {
        geoY = map.maxBounds_.yMin
        transform.y = map.height_ / 2 - map._projection([geoX, geoY])[1] * transform.k
    }
    if (map.maxBounds_.xMax !== undefined && geoX > map.maxBounds_.xMax) {
        geoX = map.maxBounds_.xMax
        transform.x = map.width_ / 2 - map._projection([geoX, geoY])[0] * transform.k
    }
    if (map.maxBounds_.yMax !== undefined && geoY > map.maxBounds_.yMax) {
        geoY = map.maxBounds_.yMax
        transform.y = map.height_ / 2 - map._projection([geoX, geoY])[1] * transform.k
    }

    // set new position
    map.position_.x = geoX
    map.position_.y = geoY

    //emit custom event with new position
    window.dispatchEvent(
        new CustomEvent('estatmap:zoomed-' + map.svgId_, {
            detail: map,
        })
    )
}

/**
 * @description get the current view's metres per pixel, based on a zoomFactor
 * @param {number} zoomFactor this zoom / previous zoom
 * @return {number}
 */
const getMetresPerPixel = function (zoomFactor, map) {
    // Get current bounding box width in meters
    const bbox = getCurrentBbox(map)
    const bboxWidth = bbox[2] - bbox[0] // BBOX width in meters

    // Calculate meters per pixel
    const metersPerPixel = bboxWidth / (map.width_ * zoomFactor)

    return metersPerPixel
}

// Zoom handler function
const zoomHandler = function (event, previousT, map) {
    const transform = event.transform
    // Compute the projected center
    const centerX = (map.width_ / 2 - transform.x) / transform.k
    const centerY = (map.height_ / 2 - transform.y) / transform.k

    // Use the projection to get the projected center in EPSG:3035
    const [projectedX, projectedY] = map._projection.invert([centerX, centerY])

    // set new position
    map.position_.x = projectedX
    map.position_.y = projectedY
    map.position_.z = getMetresPerPixel(transform.k / previousT.k, map)

    // adjust stroke dynamically according to zoom
    scaleStrokeWidths(transform, map)

    // adjust stroke dynamically according to zoom
    if (map.labels_?.values) scaleLabelTexts(transform, map)

    // adjust stroke dynamically according to zoom
    if (map.labels_?.backgrounds) scaleLabelBackgrounds(transform, map)

    //emit custom event with map object
    window.dispatchEvent(new CustomEvent('estatmap:zoomed-' + map.svgId_, { detail: map }))
}

/**
 * @description adjusts text elements dynamically according to zoom
 * @param {*} transform
 */
const scaleLabelBackgrounds = function (transform, map) {
    const zoomGroup = map.svg_.select('#em-zoom-group-' + map.svgId_)
    const elements = zoomGroup.selectAll('.em-label-background')
    const zoomFactor = transform.k
    const updates = []

    elements.each(function () {
        const element = select(this)
        // Get the original width, height, x, and y from data attributes or current attributes
        const originalWidth = parseFloat(element.attr('data-width')) || parseFloat(element.attr('width'))
        const originalHeight = parseFloat(element.attr('data-height')) || parseFloat(element.attr('height'))
        const originalX = parseFloat(element.attr('data-x')) || parseFloat(element.attr('x'))
        const originalY = parseFloat(element.attr('data-y')) || parseFloat(element.attr('y'))

        // Only process elements that have valid width, height, x, and y
        if (originalWidth > 0 && originalHeight > 0 && !isNaN(originalX) && !isNaN(originalY)) {
            // Store the original width, height, x, and y for the first time if not already stored
            if (!element.attr('data-width')) {
                element.attr('data-width', originalWidth)
                element.attr('data-height', originalHeight)
                element.attr('data-x', originalX)
                element.attr('data-y', originalY)
            }

            // Calculate the target width, height, x, and y based on zoom factor (inverse scaling)
            const targetWidth = originalWidth * (1 / zoomFactor) // Inverse scaling
            const targetHeight = originalHeight * (1 / zoomFactor) // Inverse scaling
            const targetX = originalX * (1 / zoomFactor) // Adjust x position
            const targetY = originalY * (1 / zoomFactor) // Adjust y position

            // Add the style change to a batch array
            updates.push({ element, targetWidth, targetHeight, targetX, targetY })
        }
    })

    // Apply all style changes at once
    updates.forEach(({ element, targetWidth, targetHeight, targetX, targetY }) => {
        element.attr('width', targetWidth).attr('height', targetHeight).attr('x', targetX).attr('y', targetY)
    })
}
/**
 * @description adjusts text elements dynamically according to zoom
 * @param {*} transform
 */
const scaleLabelTexts = function (transform, map) {
    const zoomGroup = map.svg_.select('#em-zoom-group-' + map.svgId_)
    const labels = zoomGroup.select('#em-labels')
    const elements = labels.selectAll('*') // Select all labels
    const zoomFactor = transform.k
    const updates = []

    elements.each(function () {
        const element = select(this)
        const computedStyle = window.getComputedStyle(this)

        // Get font-size from inline or computed style
        const inlineFontSize = element.attr('font-size')
        const cssFontSize = computedStyle.fontSize
        const fontSize = inlineFontSize || cssFontSize

        // Only process elements that have a font size defined
        if (fontSize && parseFloat(fontSize) > 0) {
            const originalFontSize = parseFloat(element.attr('data-fs')) || parseFloat(inlineFontSize) || parseFloat(cssFontSize)

            // Store the original font size for the first time
            if (!element.attr('data-fs')) {
                element.attr('data-fs', originalFontSize)
            }

            // Calculate the target font size based on zoom factor
            const targetFontSize = originalFontSize / zoomFactor

            // Add the style change to a batch array
            updates.push({ element: this, targetFontSize })
        }
    })

    // Apply all style changes at once
    updates.forEach(({ element, targetFontSize }) => {
        element.style.setProperty('font-size', `${targetFontSize}px`, 'important')
    })
}

/**
 * @description adjusts all stroke-widths dynamically according to zoom
 * @param {*} transform
 */
const scaleStrokeWidths = function (transform, map) {
    const zoomGroup = map.svg_.select('#em-zoom-group-' + map.svgId_)
    const elements = zoomGroup.selectAll('*') // Select all elements in the zoom group
    const zoomFactor = transform.k
    const updates = []

    elements.each(function () {
        const element = select(this)
        const computedStyle = window.getComputedStyle(this)

        // Get stroke-width from inline or computed style
        const inlineStrokeWidth = element.attr('stroke-width')
        const cssStrokeWidth = computedStyle.strokeWidth
        const strokeWidth = inlineStrokeWidth || cssStrokeWidth

        // Only process elements that have a stroke width defined
        if (strokeWidth && parseFloat(strokeWidth) > 0) {
            const originalStrokeWidth = parseFloat(element.attr('data-sw')) || parseFloat(inlineStrokeWidth) || parseFloat(cssStrokeWidth)

            // Store the original stroke width for the first time
            if (!element.attr('data-sw')) {
                element.attr('data-sw', originalStrokeWidth)
            }

            // Calculate the target stroke width
            const targetStrokeWidth = originalStrokeWidth / zoomFactor

            // Add the style change to a batch array
            updates.push({ element: this, targetStrokeWidth })
        }
    })

    // Apply all style changes at once
    updates.forEach(({ element, targetStrokeWidth }) => {
        element.style.setProperty('stroke-width', `${targetStrokeWidth}px`, 'important')
    })
}
