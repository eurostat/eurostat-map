import { select } from 'd3-selection'

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
    let parentRect = null
    let cachedParentWidth = 0
    let cachedParentHeight = 0
    let cachedTooltipWidth = 0
    let cachedTooltipHeight = 0
    let lastWindowWidth = window.innerWidth
    let lastWindowHeight = window.innerHeight

    function refreshBoundsAndSize() {
        const parent = document.getElementById(config.containerId)
        if (!parent) return

        parentRect = parent.getBoundingClientRect()
        cachedParentWidth = parentRect.width
        cachedParentHeight = parentRect.height

        const node = tooltip.node()
        cachedTooltipWidth = node.clientWidth
        cachedTooltipHeight = node.clientHeight

        lastWindowWidth = window.innerWidth
        lastWindowHeight = window.innerHeight
    }

    function my() {
        tooltip = select('#' + config.id)
        if (tooltip.empty()) {
            tooltip = select('body').append('div').attr('id', config.id)
        }
        tooltip.attr('class', 'em-tooltip')
    }

    my.mouseover = function (html) {
        // Only update HTML if it actually changed - avoids expensive DOM operations
        if (html !== currentHtml) {
            tooltip.html(html)
            currentHtml = html
            // Tooltip dimensions can change after HTML updates.
            refreshBoundsAndSize()
        }
        if (html) {
            let x = event.pageX
            let y = event.pageY
            lastX = x
            lastY = y
            if (!parentRect) refreshBoundsAndSize()
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
        parentRect = null
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
        let node = tooltip.node()

        // Refresh cached layout info only when viewport changes or cache is empty.
        if (!parentRect || window.innerWidth !== lastWindowWidth || window.innerHeight !== lastWindowHeight) {
            refreshBoundsAndSize()
        }

        const scrollX = window.pageXOffset || document.documentElement.scrollLeft
        const scrollY = window.pageYOffset || document.documentElement.scrollTop
        const minLeft = parentRect.left + scrollX
        const maxLeft = minLeft + cachedParentWidth - cachedTooltipWidth
        const minTop = parentRect.top + scrollY
        const maxTop = minTop + cachedParentHeight - cachedTooltipHeight

        let left = eventX + config.offset.x
        if (left > maxLeft) {
            left = eventX - cachedTooltipWidth - config.offset.x
        }

        let top = eventY - config.offset.y
        if (top + cachedTooltipHeight > minTop + cachedParentHeight) {
            top = eventY - cachedTooltipHeight - config.offset.y
        }

        node.style.left = Math.max(minLeft, Math.min(left, Math.max(minLeft, maxLeft))) + 'px'
        node.style.top = Math.max(minTop, Math.min(top, Math.max(minTop, maxTop))) + 'px'
    }

    my()
    return my
}
