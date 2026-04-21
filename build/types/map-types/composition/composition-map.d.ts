export function buildGetterSetters(out: any, attrs: string[]): void;
export function applyConfigValues(out: any, config: any, keys: string[]): void;
export function getComposition(id: string, out: any, totalCodeKey: string): any | undefined;
export function getRegionTotal(id: string, out: any, totalCodeKey: string): number | undefined;
export function getDatasetMaxMin(map: any, out: any, getAnchors: Function, totalCodeKey: string): [number, number];
export function applyClassificationToMap(map: any, out: any, getAnchors: Function, totalCodeKey: string, minSize: number, maxSize: number): void;
export function ensureCategoryColors(out: any, totalCodeKey: string, otherColor: string, otherText: string): void;
export function addMouseEventsToRegions(regions: any, out: any): void;
export function addMouseEventsToGridCartogram(out: any, chartSelector: string, getRegionTotalFn: Function, onHighlight: Function, onUnhighlight: Function): void;
export function styleMixedNUTSRegions(map: any, regions: any, getCompositionFn: Function): void;
export function buildStatCompositionMethod(out: any, totalCodeKey: string | null): Function;
export function buildTooltipBreakdownHTML(regionId: string, out: any, getRegionTotalFn: Function, spaceAsThousandSeparator: Function): string;
//# sourceMappingURL=composition-map.d.ts.map