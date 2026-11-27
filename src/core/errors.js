/** What the reader sees on a map whose boundaries could not be loaded. */
export const GEO_ERROR_MESSAGE = 'The map could not be loaded: the boundary data is unavailable.'

/**
 * Tells the caller that part of a map failed, through map.onError(). A callback that throws is logged, so that it
 * cannot stop the map's own bookkeeping (loading counters, spinner).
 * @param {*} map The main map (not an inset)
 * @param {import('../types/core/MapError').MapError} error
 */
export const reportMapError = function (map, error) {
    const callback = map?.onError_
    if (typeof callback !== 'function') return
    try {
        callback(error, map)
    } catch (e) {
        console.error('[eurostat-map] The onError callback failed:', e)
    }
}

/**
 * Writes a message where the map should be. It lives in the zoom group, which the next successful build empties.
 * @param {*} map
 * @param {string} message
 */
export const showMapErrorMessage = function (map, message = GEO_ERROR_MESSAGE) {
    const zoomGroup = map.svg_?.select('#em-zoom-group-' + map.svgId_)
    if (!zoomGroup || zoomGroup.empty()) return
    zoomGroup.select('.em-load-error').remove()

    const width = map.width_ || 400
    const text = zoomGroup
        .append('text')
        .attr('class', 'em-load-error')
        .attr('role', 'alert')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', (map.height_ || 300) / 2)

    // wrapped by character count (about 7px each): SVG text does not wrap, and a map can be phone sized
    const lineLength = Math.max(20, Math.floor((width - 20) / 7))
    const lines = []
    message.split(' ').forEach((word) => {
        const last = lines.length - 1
        if (last >= 0 && lines[last].length + word.length + 1 <= lineLength) lines[last] += ' ' + word
        else lines.push(word)
    })
    lines.forEach((line, i) => {
        text.append('tspan')
            .attr('x', width / 2)
            .attr('dy', i ? '1.3em' : 0)
            .text(line)
    })
}

/**
 * Reports a mistake in how a map was set up (the console and map.onError()), once per message.
 * @param {*} map The main map
 * @param {string} message
 */
export const reportConfigError = function (map, message) {
    map._configErrors = map._configErrors || new Set()
    if (map._configErrors.has(message)) return
    map._configErrors.add(message)
    console.error('[eurostat-map] ' + message)
    reportMapError(map, { type: 'data', message })
}
