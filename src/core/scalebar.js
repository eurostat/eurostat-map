/**
 * @function addScalebarToMap
 * @description appends an SVG scalebar to the map. Uses pixelSize to calculate units in km
 */
export const addScalebarToMap = function (out) {
    // Julien's nice scalebars
    const marginLeft = 5
    const maxLengthPix = out.scalebarMaxWidth_
    const textOffsetX = out.scalebarTextOffset_[0]
    const textOffsetY = out.scalebarTextOffset_[1]
    const pixelSizeM = out.position_.z
    const maxLengthM = maxLengthPix * pixelSizeM
    const niceLengthM = niceScaleBarLength(maxLengthM)
    const niceLengthPixel = niceLengthM[0] / pixelSizeM
    const scaleBarStartDigit = niceLengthM[1]
    const subdivisionNbs = {
        1: 4,
        2: 2,
        5: 5,
    }

    const scalebarGroup = out
        .svg()
        .append('g')
        .attr('class', 'em-scalebar')
        .attr('transform', `translate(${out.scalebarPosition_[0]},${out.scalebarPosition_[1]})`)
        .attr('width', maxLengthPix + 20)
        .attr('height', out.scalebarHeight_)

    // top line full width
    // scalebarGroup
    //     .append('line')
    //     .attr('class', 'em-scalebar-line')
    //     .attr('x1', marginLeft)
    //     .attr('y1', 1)
    //     .attr('x2', niceLengthPixel + marginLeft)
    //     .attr('y2', 1)

    //bottom line full width
    // scalebarGroup
    //     .append('line')
    //     .attr('class', 'em-scalebar-line')
    //     .attr('x1', marginLeft)
    //     .attr('y1', out.scalebarSegmentHeight_)
    //     .attr('x2', niceLengthPixel + marginLeft)
    //     .attr('y2', out.scalebarSegmentHeight_)

    //first tick
    scalebarGroup
        .append('line')
        .attr('class', 'em-scalebar-line')
        .attr('x1', marginLeft)
        .attr('y1', 1)
        .attr('x2', marginLeft)
        .attr('y2', out.scalebarTickHeight_)

    scalebarGroup
        .append('text')
        .attr('class', 'em-scalebar-label')
        .attr('x', marginLeft + textOffsetX)
        .attr('y', out.scalebarTickHeight_ + textOffsetY)
        .text('0')

    //middle ticks
    const subdivisionNb = subdivisionNbs[scaleBarStartDigit]
    const divisionWidth = niceLengthPixel / subdivisionNb
    const divisionMinWidth = 15
    const midlineY = out.scalebarSegmentHeight_ / 2 + 1
    if (divisionWidth >= divisionMinWidth) {
        for (let i = 1; i < subdivisionNb; i++) {
            scalebarGroup
                .append('line')
                .attr('class', 'em-scalebar-line')
                .attr('x1', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                .attr('y1', 1)
                .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                .attr('y2', out.scalebarTickHeight_)
            scalebarGroup
                .append('text')
                .attr('class', 'em-scalebar-label')
                .attr('x', marginLeft + textOffsetX + i * divisionWidth)
                .attr('y', out.scalebarTickHeight_ + textOffsetY)
                .text(getScalebarLabel((niceLengthM[0] / subdivisionNb) * i))

            if (i == 1) {
                scalebarGroup
                    .append('line')
                    .attr('class', 'em-scalebar-line em-scalebar-midline')
                    .attr('x1', marginLeft + out.scalebarStrokeWidth_ - 1)
                    .attr('y1', midlineY)
                    .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                    .attr('y2', midlineY)
            } else {
                let x1 = marginLeft + out.scalebarStrokeWidth_ / 2 + (i - 1) * divisionWidth
                if (x1 > 0) {
                    scalebarGroup
                        .append('line')
                        .attr('class', 'em-scalebar-line em-scalebar-midline')
                        .attr('x1', x1)
                        .attr('y1', midlineY)
                        .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + i * divisionWidth)
                        .attr('y2', midlineY)
                }
            }
        }

        // Draw final midline segment (last segment)
        if (divisionWidth >= divisionMinWidth) {
            scalebarGroup
                .append('line')
                .attr('class', 'em-scalebar-line em-scalebar-midline')
                .attr('x1', marginLeft + (subdivisionNb - 1) * divisionWidth)
                .attr('y1', midlineY)
                .attr('x2', marginLeft + subdivisionNb * divisionWidth)
                .attr('y2', midlineY)
        }
    } else {
        // single full-length horizontal mid-line
        scalebarGroup
            .append('line')
            .attr('class', 'em-scalebar-line em-scalebar-midline')
            .attr('x1', marginLeft + out.scalebarStrokeWidth_ - 1)
            .attr('y1', midlineY)
            .attr('x2', marginLeft + out.scalebarStrokeWidth_ / 2 + divisionWidth * subdivisionNb)
            .attr('y2', midlineY)
    }

    //last tick
    scalebarGroup
        .append('line')
        .attr('class', 'em-scalebar-line')
        .attr('x1', niceLengthPixel + marginLeft)
        .attr('y1', 1)
        .attr('x2', niceLengthPixel + marginLeft)
        .attr('y2', out.scalebarTickHeight_)
    scalebarGroup
        .append('text')
        .attr('class', 'em-scalebar-label')
        .attr('x', niceLengthPixel + marginLeft + textOffsetX)
        .attr('y', out.scalebarTickHeight_ + textOffsetY)
        .text(getScalebarLabel(niceLengthM[0]) + out.scalebarUnits_)
}

const niceScaleBarLength = function (scaleBarLength) {
    //compute the 'nice' power of ten
    const pow10 = Math.pow(10, Math.floor(Math.log(scaleBarLength) / Math.log(10)))

    //check if 5 times this value fits
    if (5 * pow10 <= scaleBarLength) return [5 * pow10, 5]

    //check if 2 times this value fits
    if (2 * pow10 <= scaleBarLength) return [2 * pow10, 2]

    //returns the power of ten
    return [pow10, 1]
}

const getScalebarLabel = function (valueM) {
    if (valueM < 0.01) return valueM * 1000 + 'mm'
    if (valueM < 1) return valueM * 100 + 'cm'
    if (valueM < 1000) return valueM * 1 + 'm'
    return valueM / 1000
}