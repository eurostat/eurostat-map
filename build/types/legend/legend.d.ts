/**
 * Reads the computed fill colour for a default (no-data) region from the DOM,
 * so the dimmed highlight colour always matches the map type's CSS.
 * Falls back to '#e1e1e1' if nothing is found.
 */
export function getDimmedFill(map: any): string;
export function highlightRegions(map: any, eclOrValue: any, options?: {}): void;
export function unhighlightRegions(map: any, eclOrValue: any): void;
export function clearLegendHighlight(map: any): void;
export function legend(map: any): {
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
    getHighlightFunction(map: any): typeof highlightRegions;
    getUnHighlightFunction(map: any): typeof unhighlightRegions;
};
//# sourceMappingURL=legend.d.ts.map