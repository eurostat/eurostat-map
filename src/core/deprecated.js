/* prettier-ignore */
// to keep track of deprecated functions whilst keeping the current version clean.
// also passes any important parameters to the new functions (if they exist)
// To be removed when completely phased out.

export const defineDeprecatedFunctions = (out) => {
    out.tooltipText = (v) => (console.warn('map.tooltipText() is now deprecated. Please use map.tooltip(config.textFunction) instead. See API reference for details.'), out.tooltip_.textFunction = v, out);
    out.seaFillStyle = (v) => (console.warn('seaFillStyle() is now DEPRECATED, please use the .em-sea CSS class'), out);
    out.cntrgFillStyle = (v) => (console.warn('cntrgFillStyle() is now DEPRECATED, please use the .em-cntrg CSS class'), out);
    out.nutsrgFillStyle = (v) => (console.warn('nutsrgFillStyle() is now DEPRECATED, please use the .em-nutsrg CSS class'), out);
    out.nutsbnStroke = (v) => (console.warn('nutsbnStroke() is now DEPRECATED, please use the .bn_0, .bn_1, .bn_2, .bn_3 CSS classes'), out);
    out.nutsbnStrokeWidth = (v) => (console.warn('nutsbnStrokeWidth() is now DEPRECATED, please use the .bn_0, .bn_1, .bn_2, .bn_3 CSS classes'), out);
    out.graticuleStroke = () => (console.warn('graticuleStroke() is now DEPRECATED, please use the .em-graticule CSS class'), out);
    out.graticuleStrokeWidth = () => (console.warn('graticuleStrokeWidth() is now DEPRECATED, please use the .em-graticule CSS class'), out);
    out.nutsrgSelFillSty = (v) => (console.warn('nutsrgSelFillSty() is now DEPRECATED, please use hoverColor() instead'), out.hoverColor_ = v, out);
    out.titleFontSize = (v) => (console.warn('map.titleFontSize() is now DEPRECATED. please use the .em-title CSS class'), out);
    out.subtitleFontSize = (v) => (console.warn('map.subtitleFontSize() is now DEPRECATED. please use the .em-subtitle CSS class'), out);
    out.titleFill = (v) => (console.warn('map.titleFill() is now DEPRECATED. please use the .em-title CSS class'), out);
    out.subtitleFill = (v) => (console.warn('map.subtitleFill() is now DEPRECATED. please use the .em-subtitle CSS class'), out);
    out.cntbnStroke = (v) => (console.warn('map.cntbnStroke() is now DEPRECATED. please use the .em-cntbn CSS class'), out);
    out.cntbnStrokeWidth = (v) => (console.warn('map.cntbnStrokeWidth() is now DEPRECATED. please use the .em-cntbn CSS class'), out);
    out.worldCoastStroke = (v) => (console.warn('map.worldCoastStroke() is now DEPRECATED. please use the .em-bn-co CSS class'), out);
    out.worldCoastStrokeWidth = (v) => (console.warn('map.worldCoastStrokeWidth() is now DEPRECATED. please use the .em-bn-co CSS class'), out);
    out.worldFillStyle = (v) => (console.warn('map.worldFillStyle() is now DEPRECATED. please use the .em-worldcoast CSS class'), out);
    out.coastalMarginWidth = (v) => (console.warn('map.coastalMarginWidth() is now DEPRECATED. please use the #em-coast-margin CSS rule'), out);
    out.coastalMarginColor = (v) => (console.warn('map.coastalMarginColor() is now DEPRECATED. please use the #em-coast-margin CSS rule'), out);
    out.fontFamily = (v) => (console.warn('map.fontFamily() is now DEPRECATED. please use the .em-map CSS class'), out);
    out.botTxtFontSize = (v) => (console.warn('map.botTxtFontSize() is now DEPRECATED. please use the .em-bottom-text CSS class'), out);
    out.botTxtFill = (v) => (console.warn('map.botTxtFill() is now DEPRECATED. please use the .em-bottom-text CSS class'), out);
    out.labelFill = (v) => (console.warn('map.labelFill() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelStroke = (v) => (console.warn('map.labelStroke() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelStrokeWidth = (v) => (console.warn('map.labelStrokeWidth() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelOpacity = (v) => (console.warn('map.labelOpacity() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelValuesFontSize = (v) => (console.warn('map.labelValuesFontSize() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelShadowWidth = (v) => (console.warn('map.labelShadowWidth() is now DEPRECATED. please use the .em-stat-labels-shadows CSS class'), out);
    out.labelShadowColor = (v) => (console.warn('map.labelShadowColor() is now DEPRECATED. please use the .em-stat-labels-shadows CSS class'), out);
    out.scalebarFontSize = (v) => (console.warn('map.scalebarFontSize() is now DEPRECATED. please use the .em-scalebar-label CSS class'), out);
    out.pixSize = (v) => (console.warn('map.pixSize() is now DEPRECATED. please use map.pixelSize() instead.'), out.pixelSize_ = v,out);
}
