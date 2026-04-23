/**
 * Options for SVG fill pattern definitions used in map legends.
 */
export interface FillPatternOptions {
    /** Shape of the pattern symbol. @default 'circle' */
    shape?: 'circle' | 'square'
    /** Size of the repeating pattern tile in pixels. @default 5 */
    patternSize?: number
    /** Minimum symbol size in pixels (used for the lowest class). @default 1 */
    minSize?: number
    /** Maximum symbol size in pixels (used for the highest class). @default 5.5 */
    maxSize?: number
    /** Background fill colour of the pattern tile. @default 'white' */
    bckColor?: string
    /** Fill colour of the pattern symbol. @default 'black' */
    symbColor?: string
}
