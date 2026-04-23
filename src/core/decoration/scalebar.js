/**
 * @function addScalebarToMap
 * @description appends an SVG scalebar to the map. Uses pixelSize to calculate units in km
 */
export const addScalebarToMap = function (out) {
    const sb = out.scalebar_ || getDefaultScalebarConfig()
    if (!sb.position || sb.position.length !== 2) return

    // remove existing before redraw
    out.svg().selectAll('.em-scalebar').remove()

    const marginLeft = 5
    const maxLengthPix = sb.maxWidth
    const textOffsetX = sb.textOffset[0]
    const textOffsetY = sb.textOffset[1]
    const pixelSizeM = out.position_.z
    const maxLengthM = maxLengthPix * pixelSizeM
    const niceLengthM = niceScaleBarLength(maxLengthM)
    const niceLengthPixel = niceLengthM[0] / pixelSizeM
    const scaleBarStartDigit = niceLengthM[1]

    const subdivisionNbs = { 1: 4, 2: 2, 5: 5 }

    const scalebarGroup = out
        .svg()
        .append('g')
        .attr('class', 'em-scalebar')
        .attr('transform', `translate(${sb.position[0]},${sb.position[1]})`)
        .attr('width', maxLengthPix + 20)
        .attr('height', sb.height)

    scalebarGroup
        .append('line')
        .attr('class', 'em-scalebar-line')
        .attr('x1', marginLeft)
        .attr('y1', 1)
        .attr('x2', marginLeft)
        .attr('y2', sb.tickHeight)

    scalebarGroup
        .append('text')
        .attr('class', 'em-scalebar-label')
        .attr('x', marginLeft + textOffsetX)
        .attr('y', sb.tickHeight + textOffsetY)
        .text('0')

    const subdivisionNb = subdivisionNbs[scaleBarStartDigit]
    const divisionWidth = niceLengthPixel / subdivisionNb
    const divisionMinWidth = 15
    const midlineY = sb.segmentHeight / 2 + 1

    if (divisionWidth >= divisionMinWidth) {
        for (let i = 1; i < subdivisionNb; i++) {
            scalebarGroup
                .append('line')
                .attr('class', 'em-scalebar-line')
                .attr('x1', marginLeft + sb.strokeWidth / 2 + i * divisionWidth)
                .attr('y1', 1)
                .attr('x2', marginLeft + sb.strokeWidth / 2 + i * divisionWidth)
                .attr('y2', sb.tickHeight)

            scalebarGroup
                .append('text')
                .attr('class', 'em-scalebar-label')
                .attr('x', marginLeft + textOffsetX + i * divisionWidth)
                .attr('y', sb.tickHeight + textOffsetY)
                .text(getScalebarLabel((niceLengthM[0] / subdivisionNb) * i))

            if (i === 1) {
                scalebarGroup
                    .append('line')
                    .attr('class', 'em-scalebar-line em-scalebar-midline')
                    .attr('x1', marginLeft + sb.strokeWidth - 1)
                    .attr('y1', midlineY)
                    .attr('x2', marginLeft + sb.strokeWidth / 2 + i * divisionWidth)
                    .attr('y2', midlineY)
            } else {
                const x1 = marginLeft + sb.strokeWidth / 2 + (i - 1) * divisionWidth
                if (x1 > 0) {
                    scalebarGroup
                        .append('line')
                        .attr('class', 'em-scalebar-line em-scalebar-midline')
                        .attr('x1', x1)
                        .attr('y1', midlineY)
                        .attr('x2', marginLeft + sb.strokeWidth / 2 + i * divisionWidth)
                        .attr('y2', midlineY)
                }
            }
        }

        scalebarGroup
            .append('line')
            .attr('class', 'em-scalebar-line em-scalebar-midline')
            .attr('x1', marginLeft + (subdivisionNb - 1) * divisionWidth)
            .attr('y1', midlineY)
            .attr('x2', marginLeft + subdivisionNb * divisionWidth)
            .attr('y2', midlineY)
    } else {
        scalebarGroup
            .append('line')
            .attr('class', 'em-scalebar-line em-scalebar-midline')
            .attr('x1', marginLeft + sb.strokeWidth - 1)
            .attr('y1', midlineY)
            .attr('x2', marginLeft + sb.strokeWidth / 2 + divisionWidth * subdivisionNb)
            .attr('y2', midlineY)
    }

    scalebarGroup
        .append('line')
        .attr('class', 'em-scalebar-line')
        .attr('x1', niceLengthPixel + marginLeft)
        .attr('y1', 1)
        .attr('x2', niceLengthPixel + marginLeft)
        .attr('y2', sb.tickHeight)

    scalebarGroup
        .append('text')
        .attr('class', 'em-scalebar-label')
        .attr('x', niceLengthPixel + marginLeft + textOffsetX)
        .attr('y', sb.tickHeight + textOffsetY)
        .text(getScalebarLabel(niceLengthM[0]) + sb.units)

    attachScalebarListener(out)
}

function attachScalebarListener(out) {
    if (out._scalebarListenerAttached) return
    out._scalebarListenerAttached = true

    window.addEventListener(
        'estatmap:zoomed-' + out.svgId_,
        debounce(() => {
            if (!out.scalebar_ || out.gridCartogram_ || !out.svg_) return
            addScalebarToMap(out)
        }, out.scalebarDebounce_ ?? 10)
    )
}
export const updateScalebar = function (out) {
    if (!out.svg_ || !out.scalebar_ || out.gridCartogram_) return

    const sb = out.scalebar_
    if (!sb.position || sb.position.length !== 2) {
        sb.position = [15, out.height_ - 50]
    }

    out.svg().selectAll('.em-scalebar').remove()
    addScalebarToMap(out)
}

export const attachScalebarZoomListener = function (out) {
    if (!out.scalebar_ || out.gridCartogram_) return
    if (out._scalebarZoomListenerAttached) return

    out._scalebarZoomListenerAttached = true

    window.addEventListener(
        'estatmap:zoomed-' + out.svgId_,
        debounce(() => updateScalebar(out), out.scalebarDebounce_ ?? 10)
    )
}

const niceScaleBarLength = function (scaleBarLength) {
    const pow10 = Math.pow(10, Math.floor(Math.log(scaleBarLength) / Math.log(10)))

    if (5 * pow10 <= scaleBarLength) return [5 * pow10, 5]
    if (2 * pow10 <= scaleBarLength) return [2 * pow10, 2]

    return [pow10, 1]
}

const getScalebarLabel = function (valueM) {
    if (valueM < 0.01) return valueM * 1000 + 'mm'
    if (valueM < 1) return valueM * 100 + 'cm'
    if (valueM < 1000) return valueM * 1 + 'm'
    return valueM / 1000
}

export const getDefaultScalebarConfig = function () {
    return {
        position: undefined,
        units: ' km',
        textOffset: [0, 12],
        maxWidth: 150,
        height: 90,
        strokeWidth: 1,
        segmentHeight: 6,
        tickHeight: 8,
    }
}

function debounce(func, wait) {
    let timeout
    return function (...args) {
        clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}
