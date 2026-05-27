/**
 * Strength settings for Dorling force simulation.
 */
export interface DorlingStrength {
    /** X-axis attraction strength. */
    x: number
    /** Y-axis attraction strength. */
    y: number
}

/**
 * Settings for Dorling cartogram simulation behavior.
 */
export interface DorlingSettings {
    /** Animate simulation ticks in real time. */
    animate: boolean
    /** Gravity strength toward original centroids. */
    strength: DorlingStrength
    /** Collision force iterations per tick. */
    iterations: number
    /** Extra collision padding between symbols. */
    padding: number
    /** Progress callback used by worker-based simulation. */
    onProgress?: (progress: number, map: any) => void
    /** Run non-animated simulation in a Web Worker. */
    worker: boolean
    /** URL of the D3 bundle used by Dorling worker mode. */
    workerD3URL?: string
}
