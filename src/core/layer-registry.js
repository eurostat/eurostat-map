// src/core/layer-registry.js
//
// Registry of layer types and their roles. During the multi-layer migration each
// map-type module registers itself here (starting Phase 3). Until a type is
// registered it keeps running through its legacy path; see the "map is its own
// layer 0" facade in stat-map.js.

const registry = {}

/**
 * Static role lookup, independent of registration.
 *  - 'base'    paints the shared region geometry (.em-nutsrg/.em-cntrg). At most ONE per map.
 *  - 'overlay' is drawn on top (centroids / vectors). Any number.
 * Keyed by both short codes and long names used across the codebase.
 */
export const LAYER_ROLES = {
    // bases (region fill)
    ch: 'base',
    choropleth: 'base',
    ct: 'base',
    categorical: 'base',
    chbi: 'base',
    bivariateChoropleth: 'base',
    chtri: 'base',
    ternary: 'base',
    trivariateChoropleth: 'base',
    alpha: 'base',
    valueByAlpha: 'base',
    stripe: 'base',
    scomp: 'base',
    stripeComposition: 'base',
    bar: 'base',
    barComposition: 'base', // grid cartogram (special base, migrate last)
    // overlays
    ps: 'overlay',
    proportionalSymbol: 'overlay',
    proportionalSymbols: 'overlay',
    pie: 'overlay',
    pieChart: 'overlay',
    composition: 'overlay',
    coxcomb: 'overlay',
    polar: 'overlay',
    waffle: 'overlay',
    mushroom: 'overlay',
    spark: 'overlay',
    sparkline: 'overlay',
    sparklines: 'overlay',
    flow: 'overlay',
    flowmap: 'overlay',
}

export const getRole = (type) => {
    if (registry[type]) return registry[type].role
    return LAYER_ROLES[type] || 'base'
}

export const registerLayerType = (type, role, decorate) => {
    registry[type] = { role: role || getRole(type), decorate }
}
export const getLayerType = (type) => registry[type]
export const isLayerTypeRegistered = (type) => Object.prototype.hasOwnProperty.call(registry, type)
