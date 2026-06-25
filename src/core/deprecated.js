import { updateCSSRule } from './utils.js'

/* prettier-ignore */
// to keep track of deprecated functions whilst keeping the current version clean.
// also passes any important parameters to the new functions (if they exist) and overwrites any CSS style rules.
// To be removed when completely phased out.

export const defineDeprecatedFunctions = (out) => {
    out.callback = (v) => (console.warn('callback() is now DEPRECATED, please use onBuild() instead.'), out.onBuild_ = v, out);
    // buttons
    out.showZoomButtons = (v) => (console.warn('showZoomButtons() is now DEPRECATED, please use zoomButtons() instead'), out.zoomButtons_ = v, out);
    out.showInsetsButton = (v) => (console.warn('showInsetsButton() is now DEPRECATED, please use insetsButton() instead'), out.insetsButton_ = v, out);
    out.showLegendButton = (v) => (console.warn('showLegendButton() is now DEPRECATED, please use legendButton() instead'), out.legendButton_ = v, out);
    // styles
    out.seaFillStyle = (v) => (console.warn('seaFillStyle() is now DEPRECATED, please use the .em-sea CSS class'), updateCSSRule('.em-sea','fill',v), out);
    out.cntrgFillStyle = (v) => (console.warn('cntrgFillStyle() is now DEPRECATED, please use the .em-cntrg CSS class'),updateCSSRule('.em-cntrg','fill',v), out);
    out.nutsrgFillStyle = (v) => (console.warn('nutsrgFillStyle() is now DEPRECATED, please use the .em-nutsrg CSS class'),updateCSSRule('.em-nutsrg','fill',v), out);
    out.nutsbnStroke = (v) => {
        console.warn('nutsbnStroke() is now DEPRECATED, please use the .bn_0, .bn_1, .bn_2, .bn_3 CSS classes')
        if (v['0']) {
            updateCSSRule('.bn_0','stroke',v['0'])
        }
        if (v['1']) {
            updateCSSRule('.bn_1','stroke',v['1'])
        }
        if (v['2']) {
            updateCSSRule('.bn_2','stroke',v['2'])
        }
        if (v['3']) {
            updateCSSRule('.bn_3','stroke',v['3'])
        }
        return out
    };
    out.nutsbnStrokeWidth = (v) => {
        console.warn('nutsbnStrokeWidth() is now DEPRECATED, please use the .bn_0, .bn_1, .bn_2, .bn_3 CSS classes')
        if (v['0']) {
            updateCSSRule('.bn_0','stroke-width',v['0'])
        }
        if (v['1']) {
            updateCSSRule('.bn_1','stroke-width',v['1'])
        }
        if (v['2']) {
            updateCSSRule('.bn_2','stroke-width',v['2'])
        }
        if (v['3']) {
            updateCSSRule('.bn_3','stroke-width',v['3'])
        }
        return out
    };
    out.graticuleStroke = (v) => (console.warn('graticuleStroke() is now DEPRECATED, please use the .em-graticule CSS class'), updateCSSRule('.em-graticule','stroke',v), out);
    out.graticuleStrokeWidth = (v) => (console.warn('graticuleStrokeWidth() is now DEPRECATED, please use the .em-graticule CSS class'), updateCSSRule('.em-graticule','stroke-width',v), out);
    out.nutsrgSelFillSty = (v) => (console.warn('nutsrgSelFillSty() is now DEPRECATED, please use hoverColor() instead'), out.hoverColor_ = v, out);
    out.titleFontSize = (v) => (console.warn('map.titleFontSize() is now DEPRECATED. please use the .em-title CSS class'),updateCSSRule('.em-title','font-size',v), out);
    out.subtitleFontSize = (v) => (console.warn('map.subtitleFontSize() is now DEPRECATED. please use the .em-subtitle CSS class'),updateCSSRule('.em-subtitle','font-size',v), out);
    out.subtitleFontWeight = (v) => (console.warn('map.subtitleFontWeight() is now DEPRECATED. please use the .em-subtitle CSS class'),updateCSSRule('.em-subtitle','font-weight',v), out);
    out.titleFill = (v) => (console.warn('map.titleFill() is now DEPRECATED. please use the .em-title CSS class'),updateCSSRule('.em-title','fill',v), out);
    out.subtitleFill = (v) => (console.warn('map.subtitleFill() is now DEPRECATED. please use the .em-subtitle CSS class'),updateCSSRule('.em-subtitle','fill',v), out);
    out.cntbnStroke = (v) => {
        console.warn('cntbnStroke() is now DEPRECATED, please use the .em-cntbn .em-bn-eu .em-bn-efta .em-bn-cc .em-bn-oth CSS classes')
        if (v['eu']) {
            updateCSSRule('.em-bn-eu','stroke',v['eu'])
        }
        if (v['efta']) {
            updateCSSRule('.em-bn-efta','stroke',v['efta'])
        }
        if (v['cc']) {
            updateCSSRule('.em-bn-cc','stroke',v['cc'])
        }
        if (v['oth']) {
            updateCSSRule('.em-bn-oth','stroke',v['oth'])
        }
        if (v['co']) {
            updateCSSRule('.em-bn-co','stroke',v['co'])
        }
        return out
    };
    out.cntbnStrokeWidth = (v) => {
        console.warn('cntbnStrokeWidth() is now DEPRECATED, please use the .em-cntbn .em-worldbn .em-bn-eu .em-bn-efta .em-bn-cc .em-bn-oth CSS classes')
        if (v['eu']) {
            updateCSSRule('.em-bn-eu','stroke-width',v['eu'])
        }
        if (v['efta']) {
            updateCSSRule('.em-bn-efta','stroke-width',v['efta'])
        }
        if (v['cc']) {
            updateCSSRule('.em-bn-cc','stroke-width',v['cc'])
        }
        if (v['oth']) {
            updateCSSRule('.em-bn-oth','stroke-width',v['oth'])
        }
        if (v['co']) {
            updateCSSRule('.em-bn-co','stroke-width',v['co'])
        }
        return out
    };
    out.worldStroke = (v) => (console.warn('map.worldStroke() is now DEPRECATED. please use the .em-worldbn .em-bn-co .em-bn-d CSS classes'),updateCSSRule('.em-worldbn','stroke',v), out);
    out.worldStrokeWidth = (v) => (console.warn('map.worldStrokeWidth() is now DEPRECATED. please use the .em-worldbn .em-bn-co .em-bn-d CSS classes'),updateCSSRule('.em-worldbn','stroke-width',v), out);
    out.worldCoastStroke = (v) => (console.warn('map.worldCoastStroke() is now DEPRECATED. please use the .em-bn-co CSS class'),updateCSSRule('.em-bn-co','stroke',v), out);
    out.worldCoastStrokeWidth = (v) => (console.warn('map.worldCoastStrokeWidth() is now DEPRECATED. please use the .em-bn-co CSS class'),updateCSSRule('.em-bn-co','stroke-width',v), out);
    out.worldFillStyle = (v) => (console.warn('map.worldFillStyle() is now DEPRECATED. please use the .em-worldrg CSS class'),updateCSSRule('.em-worldrg','fill',v), out); 
    out.coastalMarginWidth = (v) => (console.warn('map.coastalMarginWidth() is now DEPRECATED. please use the #em-coast-margin CSS rule'),updateCSSRule('#em-coast-margin','stroke-width',v), out);  
    out.coastalMarginColor = (v) => (console.warn('map.coastalMarginColor() is now DEPRECATED. please use the #em-coast-margin CSS rule'),updateCSSRule('#em-coast-margin','stroke',v), out);
    out.coastalMarginStdDev = (v) => (console.warn('map.coastalMarginStdDev() is now DEPRECATED. please use map.coastalMarginSettings.standardDeviation instead.'), out.coastalMarginSettings.standardDeviation = v, out);
    out.fontFamily = (v) => (console.warn('map.fontFamily() is now DEPRECATED. please use the .em-map CSS class'),updateCSSRule('.em-map','font-family',v), out);
    out.botTxtFontSize = (v) => (console.warn('map.botTxtFontSize() is now DEPRECATED. please use the .em-footnote CSS class'),updateCSSRule('.em-footnote','font-size',v), out);
    out.botTxtFill = (v) => (console.warn('map.botTxtFill() is now DEPRECATED. please use the .em-footnote CSS class'),updateCSSRule('.em-footnote','fill',v), out);
    out.scalebarFontSize = (v) => (console.warn('map.scalebarFontSize() is now DEPRECATED. please use the .em-scalebar-label CSS class'),updateCSSRule('.em-scalebar-label','font-size',v), out);
    out.frameStroke = (v)=> (console.warn('map.frameStroke() is now DEPRECATED. please use the .em-frame CSS class'),updateCSSRule('.em-frame','stroke',v), out);
    out.frameStrokeWidth = (v)=> (console.warn('map.frameStrokeWidth() is now DEPRECATED. please use the .em-frame CSS class'),updateCSSRule('.em-frame','stroke-width',v), out);

   //other
    out.psClassifMethod = (v) => (console.warn('psClassifMethod() is now DEPRECATED. please use psClassificationMethod instead'),out.psClassificationMethod_ = v, out);
    out.geoCenter = (v) => (console.warn('map.geoCenter() is now DEPRECATED. Please use map.position({x,y,z}) instead.'), out.position_.x = v[0], out.position_.y = v[1], out);
    out.pixelSize = (v) => (console.warn('map.pixelSize() is now DEPRECATED. Please use the z property in map.position({x,y,z}) instead.'), out.position_.z = v, out);
    out.pixSize = (v) => (console.warn('map.pixelSize() is now DEPRECATED. Please use the z property in map.position({x,y,z}) instead.'), out.position_.z = v, out);
    out.tooltipText = (v) => (console.warn('map.tooltipText() is now DEPRECATED. Please use map.tooltip(config.textFunction) instead. See API reference for details.'), out.tooltip_.textFunction = v, out);
    out.animateDorling = function (v) {
        if (!arguments.length) return out.dorlingSettings().animate
        console.warn('map.animateDorling() is now DEPRECATED. Please use map.dorlingSettings({ animate }) instead.')
        out.dorlingSettings({ animate: v })
        return out
    };
    out.dorlingStrength = function (v) {
        if (!arguments.length) return out.dorlingSettings().strength
        console.warn('map.dorlingStrength() is now DEPRECATED. Please use map.dorlingSettings({ strength }) instead.')
        out.dorlingSettings({ strength: v })
        return out
    };
    out.dorlingIterations = function (v) {
        if (!arguments.length) return out.dorlingSettings().iterations
        console.warn('map.dorlingIterations() is now DEPRECATED. Please use map.dorlingSettings({ iterations }) instead.')
        out.dorlingSettings({ iterations: v })
        return out
    };
    out.dorlingPadding = function (v) {
        if (!arguments.length) return out.dorlingSettings().padding
        console.warn('map.dorlingPadding() is now DEPRECATED. Please use map.dorlingSettings({ padding }) instead.')
        out.dorlingSettings({ padding: v })
        return out
    };
    out.onDorlingProgress = function (v) {
        if (!arguments.length) return out.dorlingSettings().onProgress
        console.warn('map.onDorlingProgress() is now DEPRECATED. Please use map.dorlingSettings({ onProgress }) instead.')
        out.dorlingSettings({ onProgress: v })
        return out
    };
    out.dorlingWorker = function (v) {
        if (!arguments.length) return out.dorlingSettings().worker
        console.warn('map.dorlingWorker() is now DEPRECATED. Please use map.dorlingSettings({ worker }) instead.')
        out.dorlingSettings({ worker: v })
        return out
    };
    out.dorlingWorkerD3URL = function (v) {
        if (!arguments.length) return out.dorlingSettings().workerD3URL
        console.warn('map.dorlingWorkerD3URL() is now DEPRECATED. Please use map.dorlingSettings({ workerD3URL }) instead.')
        out.dorlingSettings({ workerD3URL: v })
        return out
    };
    // composition/pie legacy aliases
    out.pieMinRadius = function (v) {
        if (!arguments.length) return out.compositionSettings ? out.compositionSettings().minSize : undefined
        console.warn('map.pieMinRadius() is now DEPRECATED. Please use map.compositionSettings({ minSize }) instead.')
        if (out.compositionSettings) out.compositionSettings({ minSize: v })
        return out
    };
    out.pieMaxRadius = function (v) {
        if (!arguments.length) return out.compositionSettings ? out.compositionSettings().maxSize : undefined
        console.warn('map.pieMaxRadius() is now DEPRECATED. Please use map.compositionSettings({ maxSize }) instead.')
        if (out.compositionSettings) out.compositionSettings({ maxSize: v })
        return out
    };
    out.pieChartInnerRadius = function (v) {
        if (!arguments.length) return out.compositionSettings ? out.compositionSettings().innerRadius : undefined
        console.warn('map.pieChartInnerRadius() is now DEPRECATED. Please use map.compositionSettings({ innerRadius }) instead.')
        if (out.compositionSettings) out.compositionSettings({ innerRadius: v })
        return out
    };
    out.pieStrokeFill = function (v) {
        if (!arguments.length) return out.compositionSettings ? out.compositionSettings().strokeFill : undefined
        console.warn('map.pieStrokeFill() is now DEPRECATED. Please use map.compositionSettings({ strokeFill }) instead.')
        if (out.compositionSettings) out.compositionSettings({ strokeFill: v })
        return out
    };
    out.pieStrokeWidth = function (v) {
        if (!arguments.length) return out.compositionSettings ? out.compositionSettings().strokeWidth : undefined
        console.warn('map.pieStrokeWidth() is now DEPRECATED. Please use map.compositionSettings({ strokeWidth }) instead.')
        if (out.compositionSettings) out.compositionSettings({ strokeWidth: v })
        return out
    };
    out.pieOtherColor = function (v) {
        if (!arguments.length) return out.compositionSettings ? out.compositionSettings().otherColor : undefined
        console.warn('map.pieOtherColor() is now DEPRECATED. Please use map.compositionSettings({ otherColor }) instead.')
        if (out.compositionSettings) out.compositionSettings({ otherColor: v })
        return out
    };
    out.pieOtherText = function (v) {
        if (!arguments.length) return out.compositionSettings ? out.compositionSettings().otherText : undefined
        console.warn('map.pieOtherText() is now DEPRECATED. Please use map.compositionSettings({ otherText }) instead.')
        if (out.compositionSettings) out.compositionSettings({ otherText: v })
        return out
    };
    out.pieTotalCode = function (v) {
        if (!arguments.length) return out.compositionTotalCode ? out.compositionTotalCode() : undefined
        console.warn('map.pieTotalCode() is now DEPRECATED. Please use map.compositionTotalCode() instead.')
        if (out.compositionTotalCode) out.compositionTotalCode(v)
        return out
    };
    // composition/waffle legacy aliases
    out.waffleMinSize = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().minSize : undefined
        console.warn('map.waffleMinSize() is now DEPRECATED. Please use map.waffleSettings({ minSize }) instead.')
        if (out.waffleSettings) out.waffleSettings({ minSize: v })
        return out
    };
    out.waffleMaxSize = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().maxSize : undefined
        console.warn('map.waffleMaxSize() is now DEPRECATED. Please use map.waffleSettings({ maxSize }) instead.')
        if (out.waffleSettings) out.waffleSettings({ maxSize: v })
        return out
    };
    out.waffleGridSize = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().gridSize : undefined
        console.warn('map.waffleGridSize() is now DEPRECATED. Please use map.waffleSettings({ gridSize }) instead.')
        if (out.waffleSettings) out.waffleSettings({ gridSize: v })
        return out
    };
    out.waffleCellPadding = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().cellPadding : undefined
        console.warn('map.waffleCellPadding() is now DEPRECATED. Please use map.waffleSettings({ cellPadding }) instead.')
        if (out.waffleSettings) out.waffleSettings({ cellPadding: v })
        return out
    };
    out.waffleStrokeFill = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().strokeFill : undefined
        console.warn('map.waffleStrokeFill() is now DEPRECATED. Please use map.waffleSettings({ strokeFill }) instead.')
        if (out.waffleSettings) out.waffleSettings({ strokeFill: v })
        return out
    };
    out.waffleStrokeWidth = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().strokeWidth : undefined
        console.warn('map.waffleStrokeWidth() is now DEPRECATED. Please use map.waffleSettings({ strokeWidth }) instead.')
        if (out.waffleSettings) out.waffleSettings({ strokeWidth: v })
        return out
    };
    out.waffleRoundedCorners = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().roundedCorners : undefined
        console.warn('map.waffleRoundedCorners() is now DEPRECATED. Please use map.waffleSettings({ roundedCorners }) instead.')
        if (out.waffleSettings) out.waffleSettings({ roundedCorners: v })
        return out
    };
    out.waffleTooltipSize = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().tooltipSize : undefined
        console.warn('map.waffleTooltipSize() is now DEPRECATED. Please use map.waffleSettings({ tooltipSize }) instead.')
        if (out.waffleSettings) out.waffleSettings({ tooltipSize: v })
        return out
    };
    out.waffleOtherColor = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().otherColor : undefined
        console.warn('map.waffleOtherColor() is now DEPRECATED. Please use map.waffleSettings({ otherColor }) instead.')
        if (out.waffleSettings) out.waffleSettings({ otherColor: v })
        return out
    };
    out.waffleOtherText = function (v) {
        if (!arguments.length) return out.waffleSettings ? out.waffleSettings().otherText : undefined
        console.warn('map.waffleOtherText() is now DEPRECATED. Please use map.waffleSettings({ otherText }) instead.')
        if (out.waffleSettings) out.waffleSettings({ otherText: v })
        return out
    };
    out.gridCartogramShape = function (v) {
        if (!arguments.length) return out.gridCartogramSettings().shape
        console.warn('map.gridCartogramShape() is now DEPRECATED. Please use map.gridCartogramSettings({ shape }) instead.')
        out.gridCartogramSettings({ shape: v })
        return out
    };
    out.gridCartogramMargins = function (v) {
        if (!arguments.length) return out.gridCartogramSettings().margins
        console.warn('map.gridCartogramMargins() is now DEPRECATED. Please use map.gridCartogramSettings({ margins }) instead.')
        out.gridCartogramSettings({ margins: v })
        return out
    };
    out.gridCartogramCellPadding = function (v) {
        if (!arguments.length) return out.gridCartogramSettings().cellPadding
        console.warn('map.gridCartogramCellPadding() is now DEPRECATED. Please use map.gridCartogramSettings({ cellPadding }) instead.')
        out.gridCartogramSettings({ cellPadding: v })
        return out
    };
    out.gridCartogramPositions = function (v) {
        if (!arguments.length) return out.gridCartogramSettings().positions
        console.warn('map.gridCartogramPositions() is now DEPRECATED. Please use map.gridCartogramSettings({ positions }) instead.')
        out.gridCartogramSettings({ positions: v })
        return out
    };
    out.classifMethod = (v) => (console.warn('map.classifMethod() is now DEPRECATED. please use map.classificationMethod() instead.'), out.classificationMethod_ = v,out);
    out.threshold = (v) => (console.warn('map.threshold() is now DEPRECATED. please use map.thresholds() instead.'), out.thresholds_ = v,out);
    out.psThreshold = (v) => (console.warn('map.psThreshold() is now DEPRECATED. please use map.psThresholds() instead.'), out.psThresholds_ = v,out);
    out.clnb = (v) => (console.warn('map.clnb() is now DEPRECATED. please use map.numberOfClasses() instead.'), out.numberOfClasses_ = v,out);
    out.nutsLvl = (v) => (console.warn('map.nutsLvl() is now DEPRECATED. please use map.nutsLevel() instead.'), out.nutsLevel_ = v,out);
    out.lg = (v) => (console.warn('map.lg() is now DEPRECATED. please use map.language() instead.'), out.language_ = v,out);
    out.bottomText = (v) => (console.warn('bottomText is now DEPRECATED. Please use the footnote() method and em-footnote CSS class instead.'),out.footnote_ = v,out);
    out.botTxtFontSize = (v) => (console.warn('botTxtFontSize is now DEPRECATED. Please use the em-footnote CSS class instead.'),out);
    out.botTxtFill = (v) => (console.warn('botTxtFill is now DEPRECATED. Please use the em-footnote CSS class instead.'),out);
    out.botTxtPadding = (v) => (console.warn('botTxtPadding is now DEPRECATED. Please use the em-footnote CSS class instead.'),out);
    out.botTxtTooltipTxt = (v) => (console.warn('botTxtTooltipTxt is now DEPRECATED. Please use footnoteTooltipText() instead.'),out);
    out.tooltipShowFlags = (v) =>(console.warn('tooltipShowFlags is now DEPRECATED. Please use out.tooltip({showFlags}) instead.'),out.tooltip_.showFlags = v,out);
    out.colorFun = (v) =>(console.warn('colorFun is now DEPRECATED. Please use out.colorFunction() instead.'),out.colorFunction_ = v,out);
    out.filtersDefinitionFun = (v)=>(console.warn('filtersDefinitionFun is now DEPRECATED. Please use out.filtersDefinitionFunction() instead.'),out.filtersDefinitionFunction_ = v,out);
    
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

    //flow maps
    out.flowDonutSizeScale = (v) => (console.warn('map.flowDonutSizeScale() is now DEPRECATED. please use flowNodeSizeScale_() instead.'), out.flowDonutSizeScale_ = v, out);
    out.flowDonuts = (v) => (console.warn('map.flowDonuts() is now DEPRECATED. please use flowNodes(true).flowNodeType("donut") instead.'), out.flowNodeType_ = v ? 'donut' : 'circle', out);
    out.flowMapType = (v) => (console.warn('map.flowMapType() is now DEPRECATED. please use flowLineType() instead.'), out.flowLineType_ = v, out);
    out.flowGradient = (v) => (console.warn('map.flowGradient() is now DEPRECATED. please use flowColorGradient() or flowWidthGradient() instead.'), out.flowColorGradient_ = v, out);
    out.flowOverlayColors = (v) => (console.warn('map.flowOverlayColors() is now DEPRECATED. please use flowRegionColors() instead.'), out.flowRegionColors_ = v, out);
    out.getFillPatternDefinitionFun = (v) => (console.warn('getFillPatternDefinitionFun is now DEPRECATED. please use fillPatternDefinitionFunction() instead.'), out.fillPatternDefinitionFunction_ = v, out);

    // scalebar is now a config object instead of separate functions (map.scalebar({}))
    out.showScalebar = (v) => (
        console.warn('DEPRECATED: use map.scalebar(true/false)'),
        out.scalebar(v),
        out
    )

    out.scalebarPosition = (v) => (
        console.warn('map.scalebarPosition() is now DEPRECATED. Please use map.scalebar({ position: [x, y] }) instead.'),
        out.scalebar({ position: v }),
        out
    )

    out.scalebarUnits = (v) => (
        console.warn('map.scalebarUnits() is now DEPRECATED. Please use map.scalebar({ units }) instead.'),
        out.scalebar({ units: v }),
        out
    )

    out.scalebarTextOffset = (v) => (
        console.warn('map.scalebarTextOffset() is now DEPRECATED. Please use map.scalebar({ textOffset: [x, y] }) instead.'),
        out.scalebar({ textOffset: v }),
        out
    )

    out.scalebarMaxWidth = (v) => (
        console.warn('map.scalebarMaxWidth() is now DEPRECATED. Please use map.scalebar({ maxWidth }) instead.'),
        out.scalebar({ maxWidth: v }),
        out
    )

    out.scalebarHeight = (v) => (
        console.warn('map.scalebarHeight() is now DEPRECATED. Please use map.scalebar({ height }) instead.'),
        out.scalebar({ height: v }),
        out
    )

    out.scalebarStrokeWidth = (v) => (
        console.warn('map.scalebarStrokeWidth() is now DEPRECATED. Please use map.scalebar({ strokeWidth }) instead.'),
        out.scalebar({ strokeWidth: v }),
        out
    )

    out.scalebarSegmentHeight = (v) => (
        console.warn('map.scalebarSegmentHeight() is now DEPRECATED. Please use map.scalebar({ segmentHeight }) instead.'),
        out.scalebar({ segmentHeight: v }),
        out
    )

    out.scalebarTickHeight = (v) => (
        console.warn('map.scalebarTickHeight() is now DEPRECATED. Please use map.scalebar({ tickHeight }) instead.'),
        out.scalebar({ tickHeight: v }),
        out
    )
    // Legacy individual setters (deprecated but kept for backward compatibility)
    out.barType = function (v) {
        if (!arguments.length) return out.barSettings_.type
        out.barSettings_.type = v
        return out
    }
    out.barMaxWidth = function (v) {
        if (!arguments.length) return out.barSettings_.maxWidth
        out.barSettings_.maxWidth = v
        return out
    }
    out.barMinWidth = function (v) {
        if (!arguments.length) return out.barSettings_.minWidth
        out.barSettings_.minWidth = v
        return out
    }
    out.barHeight = function (v) {
        if (!arguments.length) return out.barSettings_.height
        out.barSettings_.height = v
        return out
    }
    out.barGroupWidth = function (v) {
        if (!arguments.length) return out.barSettings_.groupWidth
        out.barSettings_.groupWidth = v
        return out
    }
    out.barGroupGap = function (v) {
        if (!arguments.length) return out.barSettings_.groupGap
        out.barSettings_.groupGap = v
        return out
    }
    out.barGroupMinHeight = function (v) {
        if (!arguments.length) return out.barSettings_.groupMinHeight
        out.barSettings_.groupMinHeight = v
        return out
    }
    out.barGroupMaxHeight = function (v) {
        if (!arguments.length) return out.barSettings_.groupMaxHeight
        out.barSettings_.groupMaxHeight = v
        return out
    }
    out.barStrokeFill = function (v) {
        if (!arguments.length) return out.barSettings_.strokeFill
        out.barSettings_.strokeFill = v
        return out
    }
    out.barStrokeWidth = function (v) {
        if (!arguments.length) return out.barSettings_.strokeWidth
        out.barSettings_.strokeWidth = v
        return out
    }
    out.barCornerRadius = function (v) {
        if (!arguments.length) return out.barSettings_.cornerRadius
        out.barSettings_.cornerRadius = v
        return out
    }
    out.barOtherColor = function (v) {
        if (!arguments.length) return out.barSettings_.otherColor
        out.barSettings_.otherColor = v
        return out
    }
    out.barOtherText = function (v) {
        if (!arguments.length) return out.barSettings_.otherText
        out.barSettings_.otherText = v
        return out
    }
    out.barTooltipWidth = function (v) {
        if (!arguments.length) return out.barSettings_.tooltipWidth
        out.barSettings_.tooltipWidth = v
        return out
    }
    out.barTooltipHeight = function (v) {
        if (!arguments.length) return out.barSettings_.tooltipHeight
        out.barSettings_.tooltipHeight = v
        return out
    }
}
