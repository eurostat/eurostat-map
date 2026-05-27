/**
 * Kosovo boundary features for different NUTS years.
 * Used to add Kosovo boundaries to maps since they are not included in standard NUTS datasets.
 */
export const kosovoBnFeatures: {
    [year: number]: {
        /** Type. */
        type: 'FeatureCollection'
        /** Features. */
        features: any[]
    }
}
