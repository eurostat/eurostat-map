import { select } from 'd3-selection'

/**
 * @param {*} config
 * @returns
 */
export const tooltip = function (config) {
    config = config || {}

    config.containerId = config.containerId || config.svgId || 'map' // the maximum bounds of the tooltip
    config.customElement = config.customElement // for users to specify custom tooltip elements
    config.id = config.id || `em-tooltip-${config.containerId}` // id of the tooltip div
    config.offset = {
        x: config.offset?.x || config.xOffset || 30, // x offset of the tooltip
        y: config.offset?.y || config.yOffset || 20, // y offset of the tooltip
    }
    config.transitionDuration = 0

    let tooltip

    function my() {
        tooltip = select('#' + config.div)
        if (tooltip.empty()) {
            tooltip = select('body').append('div').attr('id', config.id)
        }
        tooltip.attr('class', 'em-tooltip')
    }

    my.mouseover = function (html) {
        tooltip.html(html)
        if (html) {
            let x = event.pageX
            let y = event.pageY
            my.ensureTooltipOnScreen(x, y)
            // Fade in
            tooltip
                .interrupt() // cancel ongoing transitions
                .transition()
                .duration(config.transitionDuration) // fade
                .style('opacity', 1)
        }
    }

    my.mousemove = function (event) {
        let x = event.pageX
        let y = event.pageY
        this.ensureTooltipOnScreen(x, y)
    }

    my.mouseout = function () {
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

        node.style.left = eventX + config.offset.x + 'px'
        node.style.top = eventY - config.offset.y + 'px'

        let parent = document.getElementById(config.containerId)
        let rect = parent.getBoundingClientRect() // get the bounding rectangle
        let parentWidth = rect.width
        let parentHeight = rect.height

        //too far right
        //taking into account off screen space but shouldnt be
        if (node.offsetLeft > rect.left + parentWidth - node.clientWidth) {
            let left = eventX - node.clientWidth - config.offset.x
            node.style.left = left + 'px'
            // check if mouse covers tooltip
            if (node.offsetLeft + node.clientWidth > eventX) {
                //move tooltip left so it doesnt cover mouse
                let left2 = eventX - node.clientWidth - config.offset.x
                node.style.left = left2 + 'px'
            }
            // node.style.top = node.offsetTop + config.offset.y + "px";
        }

        //too far down
        if (node.offsetTop + node.clientHeight > rect.top + parentHeight) {
            node.style.top = node.offsetTop - node.clientHeight + 'px'
        }
    }

    my()
    return my
}
