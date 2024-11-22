/* prettier-ignore */
// to keep track of deprecated functions whilst keeping the current version clean.
// also passes any important parameters to the new functions (if they exist)
// To be removed when completely phased out.

export const defineDeprecatedFunctions = (out) => {
    out.geoCenter = (v) => (console.warn('map.geoCenter() is now deprecated. Please use map.position({x,y,z}) instead.'), out.position_.x = v[0], out.position_.y = v[1], out);
    out.pixelSize = (v) => (console.warn('map.pixelSize() is now deprecated. Please use the z property in map.position({x,y,z}) instead.'), out.position_.z = v, out);
    out.pixSize = (v) => (console.warn('map.pixelSize() is now deprecated. Please use the z property in map.position({x,y,z}) instead.'), out.position_.z = v, out);
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
    out.subtitleFontWeight = (v) => (console.warn('map.subtitleFontWeight() is now DEPRECATED. please use the .em-subtitle CSS class'), out);
    out.titleFill = (v) => (console.warn('map.titleFill() is now DEPRECATED. please use the .em-title CSS class'), out);
    out.subtitleFill = (v) => (console.warn('map.subtitleFill() is now DEPRECATED. please use the .em-subtitle CSS class'), out);
    out.cntbnStroke = (v) => (console.warn('map.cntbnStroke() is now DEPRECATED. please use the .em-cntbn CSS class'), out);
    out.cntbnStrokeWidth = (v) => (console.warn('map.cntbnStrokeWidth() is now DEPRECATED. please use the .em-cntbn CSS class'), out);
    out.worldStroke = (v) => (console.warn('map.worldStroke() is now DEPRECATED. please use the .em-cntbn CSS class'), out);
    out.worldStrokeWidth = (v) => (console.warn('map.worldStrokeWidth() is now DEPRECATED. please use the .em-cntbn CSS class'), out);
    out.worldCoastStroke = (v) => (console.warn('map.worldCoastStroke() is now DEPRECATED. please use the .em-bn-co CSS class'), out);
    out.worldCoastStrokeWidth = (v) => (console.warn('map.worldCoastStrokeWidth() is now DEPRECATED. please use the .em-bn-co CSS class'), out);
    out.worldFillStyle = (v) => (console.warn('map.worldFillStyle() is now DEPRECATED. please use the .em-worldcoast CSS class'), out);
    out.coastalMarginWidth = (v) => (console.warn('map.coastalMarginWidth() is now DEPRECATED. please use the #em-coast-margin CSS rule'), out);
    out.coastalMarginColor = (v) => (console.warn('map.coastalMarginColor() is now DEPRECATED. please use the #em-coast-margin CSS rule'), out);
    out.fontFamily = (v) => (console.warn('map.fontFamily() is now DEPRECATED. please use the .em-map CSS class'), out);
    out.botTxtFontSize = (v) => (console.warn('map.botTxtFontSize() is now DEPRECATED. please use the .em-footnote CSS class'), out);
    out.botTxtFill = (v) => (console.warn('map.botTxtFill() is now DEPRECATED. please use the .em-footnote CSS class'), out);
    out.scalebarFontSize = (v) => (console.warn('map.scalebarFontSize() is now DEPRECATED. please use the .em-scalebar-label CSS class'), out);
    out.classifMethod = (v) => (console.warn('map.classifMethod() is now DEPRECATED. please use map.classificationMethod() instead.'), out.classificationMethod_ = v,out);
    out.clnb = (v) => (console.warn('map.clnb() is now DEPRECATED. please use map.numberOfClasses() instead.'), out.numberOfClasses_ = v,out);
    out.nutsLvl = (v) => (console.warn('map.nutsLvl() is now DEPRECATED. please use map.nutsLevel() instead.'), out.nutsLevel_ = v,out);
    out.lg = (v) => (console.warn('map.lg() is now DEPRECATED. please use map.language() instead.'), out.language_ = v,out);
    out.bottomText = (v) => (console.warn('bottomText is now DEPRECATED. Please use the footnote() method and em-footnote CSS class instead.'),out.footnote_ = v,out);
    out.botTxtFontSize = (v) => (console.warn('botTxtFontSize is now DEPRECATED. Please use the em-footnote CSS class instead.'),out);
    out.botTxtFill = (v) => (console.warn('botTxtFill is now DEPRECATED. Please use the em-footnote CSS class instead.'),out);
    out.botTxtPadding = (v) => (console.warn('botTxtPadding is now DEPRECATED. Please use the em-footnote CSS class instead.'),out);
    out.botTxtTooltipTxt = (v) => (console.warn('botTxtTooltipTxt is now DEPRECATED. Please use footnoteTooltipText() instead.'),out);
    out.tooltipShowFlags = (v) =>(console.warn('tooltipShowFlags is now DEPRECATED. Please use out.tooltip({showFlags}) instead.'),out.tooltip_.showFlags = v,out);
    out.colorFun = (v) =>(console.warn('colorFun is now DEPRECATED. Please use out.colorFunction() instead.'),out.colorFun_ = v,out);

    //labelling
    out.labelling = (v) =>(console.warn('labelling is now DEPRECATED. Please use out.labels({}) configuration object instead. See documentation for details.'),out);
    out.labelsConfig = (v) =>(console.warn('labelsConfig is now DEPRECATED. Please use out.labels({config:yourConfig}) configuration object instead. See documentation for details.'),out.labels_ =Object.assign(out.labels_ || {}, { config: v }),out);
    out.statLabelsPositions = (v) =>(console.warn('statLabelsPositions is now DEPRECATED. Please use out.labels({statLabelsPositions:yourPositions}) instead. See documentation for details.'),out.labels_ = Object.assign(out.labels_ || {}, { statLabelsPositions: v }),out);
    out.labelsToShow = (v) =>(console.warn('labelsToShow is now DEPRECATED. Please use out.labels({labelFilterFunction:yourFunction(region,map)}) function instead. See documentation for details.'),out);
    out.labelShadowsToShow = (v) =>(console.warn('labelShadowsToShow is now DEPRECATED. Please use out.labels({labelFilterFunction:yourFunction(region,map)}) function instead. See documentation for details.'),out);
    out.labelShadow = (v) =>(console.warn('labelShadow is now DEPRECATED. Please use out.labels({labelShadow:boolean}) instead. See documentation for details.'),out);
    out.labelShadowWidth = (v) =>(console.warn('labelShadow is now DEPRECATED. Please use out.labels({labelShadow:boolean}) instead. See documentation for details.'),out);
    out.labelFilterFunction =(v) =>(console.warn('labelFilterFunction is now DEPRECATED. Please use out.labels({labelFilterFunction:yourFunction(region,map)}) instead. See documentation for details.'),out);
    out.labelFill = (v) => (console.warn('map.labelFill() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelStroke = (v) => (console.warn('map.labelStroke() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelStrokeWidth = (v) => (console.warn('map.labelStrokeWidth() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelOpacity = (v) => (console.warn('map.labelOpacity() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelValuesFontSize = (v) => (console.warn('map.labelValuesFontSize() is now DEPRECATED. please use the .em-stat-labels CSS class'), out);
    out.labelShadowWidth = (v) => (console.warn('map.labelShadowWidth() is now DEPRECATED. please use the .em-stat-labels-shadows CSS class'), out);
    out.labelShadowColor = (v) => (console.warn('map.labelShadowColor() is now DEPRECATED. please use the .em-stat-labels-shadows CSS class'), out);

    out.countriesToShow = (v) => (console.warn('map.countriesToShow() is now DEPRECATED. please use the map.filterGeometriesFunction() function if you wish to filter the default geometries.'), out);
    out.bordersToShow = (v) => (console.warn('map.bordersToShow() is now DEPRECATED. please use the map.filterGeometriesFunction() function if you wish to filter the default geometries.'), out);
}
