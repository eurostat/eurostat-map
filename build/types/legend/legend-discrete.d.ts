/**
 * Shared label formatter factory for discrete colour legends.
 * Works for both choropleth and prop-symbol colour scales.
 *
 * @param {object} out - legend instance
 * @param {function} getThresholdsFn - map-specific threshold getter, called lazily
 * @param {object} statData - stat data object (may be null)
 * @param {string} labelType - 'thresholds' | 'ranges'
 * @param {function|null} userFormatter - user-supplied override
 * @returns {function}
 */
export function buildDiscreteLabelFormatter(out: object, getThresholdsFn: Function, statData: object, labelType: string, userFormatter: Function | null): Function;
/**
 * Resolve decimal places: explicit config > auto-detect from data > 0.
 * Checks both root out.decimals and nested out.colorLegend.decimals.
 *
 * @param {object} out - legend instance
 * @param {object} statData - stat data object (may be null)
 * @returns {number}
 */
export function resolveDecimals(out: object, statData: object): number;
export function drawDiscreteLegend(out: any, x: any, y: any): void;
//# sourceMappingURL=legend-discrete.d.ts.map