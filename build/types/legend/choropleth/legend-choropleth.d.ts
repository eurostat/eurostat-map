export function getThresholds(out: any): any;
export function getChoroplethLabelFormatter(out: any): Function;
/**
 * Threshold ticks + dataset min/max at the ends.
 * Example: thresholds [10, 20, 30], data in [3, 42]
 *  -> [3, 10, 20, 30, 42]  (or reversed if !ascending)
 */
export function getThresholdTicksWithExtents(out: any): any;
export function legend(map: any, config: any): {
    map: any;
    svgId: string;
    svg: any;
    lgg: any;
    x: any;
    y: any;
    boxPadding: number;
    boxOpacity: number;
    title: string;
    titleFontSize: number;
    width: number;
    titlePadding: number;
    shapeWidth: number;
    shapeHeight: number;
    shapePadding: number;
    labelFontSize: number;
    labelOffsets: {
        x: number;
        y: number;
    };
    labelFormatter: any;
    noData: boolean;
    noDataText: string;
    noDataPadding: number;
    noDataShapeWidth: number;
    noDataShapeHeight: number;
    ascending: boolean;
    decimals: any;
    maxMin: boolean;
    maxMinLabels: string[];
    build(): void;
    update(): /*elided*/ any;
    updateContainer(): void;
    updateConfig(): void;
    makeBackgroundBox(): void;
    addTitle(): void;
    addSubtitle(): void;
    getBaseY(): number;
    getBaseX(): number;
    setBoxDimension(): void;
    appendNoDataLegend(container: any, noDataText: any, highlightFunction: any, unhighlightFunction: any): void;
    getNumberOfClasses(out: any): any;
    getLabelFormatter(out: any): Function;
    getClassToFillStyle(out: any): any;
    getColorClassifier(out: any): any;
    getColorStats(out: any): any;
    getHighlightFunction(map: any): typeof Legend.highlightRegions;
    getUnHighlightFunction(map: any): typeof Legend.unhighlightRegions;
};
import * as Legend from '../legend';
//# sourceMappingURL=legend-choropleth.d.ts.map