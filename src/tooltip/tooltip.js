import { select } from 'd3-selection'

/**
 * @param {*} config
 * @returns
 */
export const tooltip = function (config) {
    config = config || {}
    config.containerId = config.containerId || 'map'
    config.div = config.div || 'tooltip_eurostat'
    config.maxWidth = config.maxWidth || '200px'
    config.fontSize = config.fontSize || '14px'
    config.background = config.background || 'white'
    config.padding = config.padding || '0px'
    config.border = config.border || '0px'
    config.borderRadius = config.borderRadius || '0px'
    config.boxShadow = config.boxShadow || '0px 0px 0px grey'
    config.fontFamily = config.fontFamily || 'Helvetica, Arial, sans-serif'

    config.transitionDuration = config.transitionDuration || 0
    config.xOffset = config.xOffset || 30
    config.yOffset = config.yOffset || 20

    var tooltip

    function my() {
        tooltip = select('#' + config.div)
        if (tooltip.empty()) tooltip = select('body').append('div').attr('id', config.div)

        //tooltip.style("width",config.width);
        // USE CSS
        tooltip.style('max-width', config.maxWidth)
        tooltip.style('overflow', 'hidden')
        tooltip.style('font-size', config.fontSize)
        tooltip.style('background', config.background)
        tooltip.style('padding', config.padding)
        tooltip.style('border', config.border)
        tooltip.style('border-radius', config.borderRadius)
        tooltip.style('box-shadow', config.boxShadow)
        tooltip.style('position', 'absolute')
        tooltip.style('font-family', config.fontFamily)
        tooltip.style('pointer-events', 'none')
        tooltip.style('opacity', '0')
    }

    my.mouseover = function (html) {
        if (html) tooltip.html(html)
        let x = event.pageX
        let y = event.pageY
        my.ensureTooltipOnScreen(x, y)
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
