/** Return a valid percentage, including numeric strings from CSV data. */
export function parseCircleRingValue(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return undefined
    const percentage = Number(value)
    return percentage >= 0 && percentage <= 100 ? percentage : undefined
}

export function getCircleRingStatData(layer) {
    if (layer.psShape_ !== 'circle' || layer.psCustomSVG_ || !Number.isFinite(layer.psRingWidth_) || layer.psRingWidth_ <= 0) return
    if (layer.getEncodingStat('ring')) return layer.getEncodingStatData('ring')
}

/** Append the track and the share of its circumference that is filled. */
export function appendCircleRing(parent, percentage, style, rotation = -90) {
    const ring = parent
        .append('g')
        .attr('class', 'em-ps-ring')
        .attr('aria-hidden', 'true')
        .attr('pointer-events', 'none')
        .attr('fill', 'none')
        .attr('transform', `rotate(${rotation})`)
        .attr('stroke-width', style.psRingWidth_)

    ring.append('circle').attr('class', 'em-ps-ring-track').attr('stroke', style.psRingTrackColor_)
    if (percentage > 0) {
        ring.append('circle')
            .attr('class', 'em-ps-ring-arc')
            .attr('stroke', style.psRingColor_)
            .attr('pathLength', 100)
            .attr('stroke-dasharray', percentage === 100 ? null : `${percentage} ${100 - percentage}`)
    }
    return ring
}
