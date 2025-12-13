import { scaleLinear, scaleSqrt } from "d3-scale";
import { max, min } from "d3-array";

/**
 * Create a proportional circle radius scale (area ∝ value)
 *
 * @param {Array<number>} rawData  Raw statistical values
 * @param {number} maxSize         Maximum radius in px
 * @param {number} minSize         Minimum visible radius for positive values
 */
export function createSqrtScale(
  rawData = [],
  maxSize = 20,
  minSize = 0
) {
  // ----------------------------
  // 1. Sanitize data
  // ----------------------------
  const positives = rawData
    .map(Number)
    .filter(v => Number.isFinite(v) && v > 0);

  let dataMax = max(positives);
  let dataMin = min(positives);

  if (!Number.isFinite(dataMax) || dataMax <= 0) dataMax = 1;
  if (!Number.isFinite(dataMin) || dataMin <= 0) dataMin = dataMax;

  const minR = Math.max(0, minSize);

  // ----------------------------
  // 2. Base sqrt scale (area-correct)
  // ----------------------------
  const base = scaleSqrt()
    .domain([0, dataMax])
    .range([0, maxSize])
    .clamp(true);

  // ----------------------------
  // 3. Final classifier
  // ----------------------------
  function scale(v) {
    const x = +v;
    if (!Number.isFinite(x) || x <= 0) return 0;
    return Math.max(minR, base(x));
  }

  // ----------------------------
  // 4. D3-like helpers
  // ----------------------------
  scale.domain = () => [dataMin, dataMax];
  scale.maxSize = () => maxSize;
  scale.minSize = () => minR;
  scale.baseScale = () => base;

  return scale;
}


/**
 * Create a linear scale (e.g for line widths)
 *
 * @param {Array<number>} rawData  Raw statistical values
 * @param {number} maxSize         Maximum width in px
 * @param {number} minSize         Minimum visible width for positive values
 */
export function createLinearScale(
  rawData = [],
  maxSize = 20,
  minSize = 0
) {
  // ----------------------------
  // 1. Sanitize data
  // ----------------------------
  const positives = rawData
    .map(Number)
    .filter(v => Number.isFinite(v) && v > 0);

  let dataMax = max(positives);
  let dataMin = min(positives);

  if (!Number.isFinite(dataMax) || dataMax <= 0) dataMax = 1;
  if (!Number.isFinite(dataMin) || dataMin <= 0) dataMin = dataMax;

  const minR = Math.max(0, minSize);

  // ----------------------------
  // 2. Base linear scale
  // ----------------------------
  const base = scaleLinear()
    .domain([0, dataMax])
    .range([0, maxSize])
    .clamp(true);

  // ----------------------------
  // 3. Final classifier
  // ----------------------------
  function scale(v) {
    const x = +v;
    if (!Number.isFinite(x) || x <= 0) return 0;
    return Math.max(minR, base(x));
  }

  // ----------------------------
  // 4. D3-like helpers
  // ----------------------------
  scale.domain = () => [dataMin, dataMax];
  scale.maxSize = () => maxSize;
  scale.minSize = () => minR;
  scale.baseScale = () => base;

  return scale;
}
