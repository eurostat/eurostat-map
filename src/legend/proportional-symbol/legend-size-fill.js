/**
 * The fill of the symbols in a size legend. They show size only, so they are neutral when the map's symbols have
 * several colours: classes of a second variable, or the two signs of data with negative values.
 */
export function getSizeLegendFill(out) {
    const layer = out.layer || out.map
    if (layer.classifierColor_) return out.sizeLegend.shapeFill
    return layer._psSigned ? '#b0b0b0' : layer.psFill_
}
