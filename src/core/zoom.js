import { zoom, zoomIdentity } from 'd3-zoom'
import { select } from 'd3-selection'

export const defineMapZoom = function (map) {
    if (map.gridCartogram_) {
        defineGridCartogramZoom(map)
        return
    }

    // existing geographic zoom logic
    defineGeographicZoom(map)
}

function defineGridCartogramZoom(map) {
    const svg = map.svg()
    const zoomGroup = svg.select('#em-zoom-group-' + map.svgId_)

    map.__zoomBehavior = zoom()
        .scaleExtent(map.zoomExtent_ || [1, 8])
        .on('zoom', (event) => {
            zoomGroup.attr('transform', event.transform)
            map.__lastTransform = event.transform
            map.onZoom_?.(event, map)
        })
        .on('end', (event) => {
            map.onZoomEnd_?.(event, map)
        })

    svg.call(map.__zoomBehavior)
    svg.call(map.__zoomBehavior.transform, zoomIdentity)
}

export const defineGeographicZoom = function (map) {
    const svg = select('#' + map.svgId())
    let previousT = zoomIdentity
    let panUnlocked = !map.lockPanUntilZoom_
    let snappingBack = false
    const zoomExtent = map.zoomExtent_ || [0, 0]

    // If the user allows zoom < 1 (e.g. [0.1, 10]), pad translateExtent based on kmin.
    // This keeps panning possible even when zoomed out.
    const kmin = Math.max(zoomExtent[0] || 1, 0.01)
    const needsPad = kmin < 1
    const panPadFactor = map.panPadFactor_ ?? 0.1
    const padX = needsPad ? panPadFactor * (1 / kmin - 1) * map.width_ : map.width_
    const padY = needsPad ? panPadFactor * (1 / kmin - 1) * map.height_ : map.height_

    const translateExtent = map.translateExtent_
        ? map.translateExtent_
        : needsPad
          ? [
                [-padX, -padY],
                [map.width_ + padX, map.height_ + padY],
            ]
          : [
                [0, 0],
                [map.width_, map.height_],
            ]

    map.__zoomBehavior = zoom()
        .filter((e) => !e.target.closest('.em-zoom-buttons') && !e.target.closest('.em-button'))
        .extent([
            [0, 0],
            [map.width_, map.height_],
        ])
        .scaleExtent(zoomExtent)
        .translateExtent(translateExtent)

        .on('start', (e) => {
            if (e.sourceEvent && e.sourceEvent.type !== 'wheel') {
                svg.classed('em-dragging', true)
            }
        })

        .on('zoom', (e) => {
            const t = e.transform
            const zoomGroup = map.svg_.select('#em-zoom-group-' + map.svgId_)

            if (snappingBack) {
                snappingBack = false
                return
            }

            map.__lastTransform = t

            if (t.k !== previousT.k) {
                if (map.lockPanUntilZoom_) panUnlocked = true
                zoomHandler(e, previousT, map)
                zoomGroup.attr('data-zoom', t.k).attr('transform', t)
                previousT = t
            } else if (!map.lockPanUntilZoom_ || panUnlocked) {
                panHandler(e, map)
                zoomGroup.attr('transform', t)
                previousT = t
            } else {
                snappingBack = true
                svg.call(map.__zoomBehavior.transform, previousT)
            }
        })
        .on('end', (e) => {
            svg.classed('em-dragging', false)
            map.onZoomEnd_?.(e, map)
            window.dispatchEvent(new CustomEvent('estatmap:zoomend-' + map.svgId_, { detail: map }))
        })

    map.__lastTransform = previousT

    // Compute baseline metres per pixel (k=1) from left/right edges
    if (!map.__baseZ) {
        const centerY = map.height_ / 2
        const [geoLeftX] = map._projection.invert([0, centerY])
        const [geoRightX] = map._projection.invert([map.width_, centerY])
        map.__baseZ = (geoRightX - geoLeftX) / map.width_
    }

    svg.call(map.__zoomBehavior)
}

export function setMapView(map, pos) {
    if (!map.svg_ || !map.__zoomBehavior) return
    const svg = map.svg_
    const zoomGroup = svg.select('#em-zoom-group-' + map.svgId_)

    const k = map.__baseZ / pos.z
    const [projX, projY] = map._projection([pos.x, pos.y])
    const tx = map.width_ / 2 - projX * k
    const ty = map.height_ / 2 - projY * k

    const newTransform = zoomIdentity.translate(tx, ty).scale(k)
    map.__programmaticZoom = { x: pos.x, y: pos.y, z: pos.z }
    map.__lastTransform = newTransform

    svg.call(map.__zoomBehavior.transform, newTransform)
    zoomGroup.attr('data-zoom', k)

    map.position_.x = pos.x
    map.position_.y = pos.y
    map.position_.z = pos.z
}

const panHandler = (event, map) => {
    const t = event.transform
    const cx = (map.width_ / 2 - t.x) / t.k
    const cy = (map.height_ / 2 - t.y) / t.k
    const [geoX, geoY] = map._projection.invert([cx, cy])

    map.position_.x = geoX
    map.position_.y = geoY

    window.dispatchEvent(new CustomEvent('estatmap:zoomed-' + map.svgId_, { detail: map }))
    if (typeof map.onZoom_ === 'function') map.onZoom_(event, map) // <--- new hook. user defined
}

const zoomHandler = (event, previousT, map) => {
    const t = event.transform
    const cx = (map.width_ / 2 - t.x) / t.k
    const cy = (map.height_ / 2 - t.y) / t.k
    const [projectedX, projectedY] = map._projection.invert([cx, cy])

    if (map.__programmaticZoom) {
        const p = map.__programmaticZoom
        map.position_.x = p.x
        map.position_.y = p.y
        map.position_.z = p.z
        delete map.__programmaticZoom
    } else {
        map.position_.x = projectedX
        map.position_.y = projectedY
        map.position_.z = map.__baseZ / t.k
    }

    //  Store current zoom scale for later use (hover, click, etc.)
    map._lastZoomK = t.k

    scaleStrokeWidths(t, map)
    if (map.labels_?.scaleOnZoom !== false) {
        scaleLabelTexts(t, map)
    }
    if (map.labels_?.backgrounds) scaleLabelBackgrounds(t, map)

    window.dispatchEvent(new CustomEvent('estatmap:zoomed-' + map.svgId_, { detail: map }))
    if (typeof map.onZoom_ === 'function') map.onZoom_(event, map) // <--- new hook. user defined
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
