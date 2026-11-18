import { select } from 'd3-selection'
import { placeTooltip } from './placement'

/**
 * @param {*} config
 * @returns
 */
export const tooltip = function (config) {
    config = config || {}

    config.containerId = config.containerId || config.svgId || 'map' // the maximum bounds of the tooltip
    config.id = config.id || `em-tooltip-${config.containerId}` // id of the tooltip div
    config.offset = {
        x: config.offset?.x || config.xOffset || 30, // x offset of the tooltip
        y: config.offset?.y || config.yOffset || 20, // y offset of the tooltip
    }
    config.transitionDuration = 0
    config.opacity = config.opacity || 1

    let tooltip
    let rafId = null // requestAnimationFrame ID for throttling
    let lastX = 0
    let lastY = 0
    let currentHtml = '' // Cache current HTML to avoid unnecessary DOM updates
    let layout = null

    function refreshBoundsAndSize() {
        const { innerWidth, innerHeight, scrollX, scrollY } = window
        const parentRect = document.getElementById(config.containerId)?.getBoundingClientRect()
        const bounds = {
            left: Math.max(0, parentRect?.left ?? 0) + scrollX,
            top: Math.max(0, parentRect?.top ?? 0) + scrollY,
            right: Math.min(innerWidth, parentRect?.right ?? innerWidth) + scrollX,
            bottom: Math.min(innerHeight, parentRect?.bottom ?? innerHeight) + scrollY,
        }
        const node = tooltip.node()
        node.style.setProperty('--em-tooltip-bounds-width', Math.max(0, bounds.right - bounds.left) + 'px')
        node.style.setProperty('--em-tooltip-bounds-height', Math.max(0, bounds.bottom - bounds.top) + 'px')
        node.style.removeProperty('--em-tooltip-placement-height')
        const { width, height } = node.getBoundingClientRect()
        layout = { bounds, size: { width, height }, innerWidth, innerHeight, scrollX, scrollY }
    }

    function my() {
        tooltip = select('#' + config.id)
        if (tooltip.empty()) {
            tooltip = select('body').append('div').attr('id', config.id)
        }
        tooltip.attr('class', 'em-tooltip')
    }

    my.mouseover = function (html, pointerEvent) {
        // Only update HTML if it actually changed - avoids expensive DOM operations
        if (html !== currentHtml) {
            tooltip.html(html)
            currentHtml = html
            // Tooltip dimensions can change after HTML updates.
            refreshBoundsAndSize()
        }
        if (html) {
            // Do not rely on the legacy window.event global: it is not available in
            // every browser and can be cleared before asynchronous handlers run.
            const activeEvent = pointerEvent || window.event
            let x = activeEvent?.pageX || 0
            let y = activeEvent?.pageY || 0
            lastX = x
            lastY = y
            my.ensureTooltipOnScreen(x, y)
            // Fade in
            tooltip
                .interrupt() // cancel ongoing transitions
                .transition()
                .duration(config.transitionDuration) // fade
                .style('opacity', config.opacity)
        }
    }

    my.mousemove = function (event) {
        let x = event.pageX
        let y = event.pageY
        lastX = x
        lastY = y

        // Throttle position updates using requestAnimationFrame
        // This limits updates to ~60fps instead of firing on every mouse pixel movement
        if (!rafId) {
            rafId = requestAnimationFrame(() => {
                this.ensureTooltipOnScreen(lastX, lastY)
                rafId = null
            })
        }
    }

    my.mouseout = function () {
        // Cancel any pending position update
        if (rafId) {
            cancelAnimationFrame(rafId)
            rafId = null
        }
        // Clear HTML cache for next hover
        currentHtml = ''
        layout = null
        // Fade out
        tooltip.interrupt().transition().duration(config.transitionDuration).style('opacity', 0)
    }

    my.style = function (k, v) {
        if (arguments.length == 1) return tooltip.style(k)
        tooltip.style(k, v)
        return my
    }

    my.attr = function (k, v) {
        if (arguments.length == 1) return tooltip.attr(k)
        tooltip.attr(k, v)
        return my
    }

    /**
     * @function ensureTooltipOnScreen
     * @description Prevents the tooltip from overflowing off screen
     */
    my.ensureTooltipOnScreen = function (eventX, eventY) {
        const { innerWidth, innerHeight, scrollX, scrollY } = window
        if (!layout || innerWidth !== layout.innerWidth || innerHeight !== layout.innerHeight ||
            scrollX !== layout.scrollX || scrollY !== layout.scrollY) {
            refreshBoundsAndSize()
        }
        const { x, y, maxHeight } = placeTooltip(layout.bounds, layout.size, { x: eventX, y: eventY }, config.offset)
        const node = tooltip.node()
        if (maxHeight == null) node.style.removeProperty('--em-tooltip-placement-height')
        else node.style.setProperty('--em-tooltip-placement-height', maxHeight + 'px')
        node.style.left = x + 'px'
        node.style.top = y + 'px'
    }

    my()
    return my
}
