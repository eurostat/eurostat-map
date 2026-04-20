export function loadPlacenames(out: any, url?: string): Promise<any>;
export function addPlacenameLabels(out: any): Promise<void>;
/**
 * Append filtered placenames to SVG and scale immediately based on zoom.
 */
export function appendPlacenameLabels(out: any): void;
/**
 * Recompute label positions & size on zoom/pan
 */
export function updatePlacenameLabels(out: any, transform: any, maxLabels?: number, padding?: number): void;
//# sourceMappingURL=placenames.d.ts.map