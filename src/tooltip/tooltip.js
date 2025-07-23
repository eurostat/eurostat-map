import { select } from 'd3-selection'

/**
 * @param {*} config
 * @returns
 */
export const tooltip = function (config) {
    config = config || {}

    config.containerId = config.containerId || config.svgId || 'map'
    config.div = config.div || `em-tooltip-${config.containerId}`
    config.id = config.id || config.div
    config.xOffset = config.xOffset || 30
    config.yOffset = config.yOffset || 20

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
        }
    }

    my.mousemove = function (event) {
        let x = event.pageX
        let y = event.pageY
        this.ensureTooltipOnScreen(x, y)
    }

    my.mouseout = function () {
        tooltip.style('opacity', 0)
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
        tooltip.style('opacity', 1)
        let node = tooltip.node()

        node.style.left = eventX + config.xOffset + 'px'
        node.style.top = eventY - config.yOffset + 'px'

        let parent = document.getElementById(config.containerId)
        let rect = parent.getBoundingClientRect() // get the bounding rectangle
        let parentWidth = rect.width
        let parentHeight = rect.height

        //too far right
        //taking into account off screen space but shouldnt be
        if (node.offsetLeft > rect.left + parentWidth - node.clientWidth) {
            let left = eventX - node.clientWidth - config.xOffset
            node.style.left = left + 'px'
            // check if mouse covers tooltip
            if (node.offsetLeft + node.clientWidth > eventX) {
                //move tooltip left so it doesnt cover mouse
                let left2 = eventX - node.clientWidth - config.xOffset
                node.style.left = left2 + 'px'
            }
            // node.style.top = node.offsetTop + config.yOffset + "px";
        }

        //too far down
        if (node.offsetTop + node.clientHeight > rect.top + parentHeight) {
            node.style.top = node.offsetTop - node.clientHeight + 'px'
        }
    }

    my()
    return my
}
