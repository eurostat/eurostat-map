import { TernaryPoint, VisualizationOptions } from '../types';
/**
 * D3.js visualization for Tricolore
 */
export declare class TricoloreViz {
    private container;
    private readonly width;
    private readonly height;
    private margin;
    private svg;
    private triangle;
    private legend;
    private circles;
    private canvas;
    private ctx;
    /**
     * Create a TricoloreViz instance
     *
     * @param selector - CSS selector for container or D3 selection
     * @param width - Width of the visualization
     * @param height - Height of the visualization
     * @param margin - Margins around the visualization
     *
     * @throws Error - If D3.js is not available
     */
    constructor(selector: string | any, width?: number, height?: number, margin?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    });
    /**
     * Create a continuous ternary plot using canvas
     *
     * @param data - Array of ternary points
     * @param options - Visualization options
     *
     * @throws Error - If showData is true and data contains invalid ternary points
     */
    createContinuousPlot(data?: TernaryPoint[], options?: Partial<VisualizationOptions>): void;
    /**
     * Create a discrete ternary plot using SVG polygons
     *
     * @param data - Array of ternary points
     * @param options - Visualization options
     *
     * @throws Error - If showData is true and data contains invalid ternary points
     */
    createDiscretePlot(data?: TernaryPoint[], options?: Partial<VisualizationOptions>): void;
    /**
     * Create a sextant ternary plot
     *
     * @param data - Array of ternary points
     * @param options - Visualization options
     *
     * @throws Error - If showData is true and data contains invalid ternary points
     */
    createSextantPlot(data?: TernaryPoint[], options?: Partial<VisualizationOptions> & {
        values?: string[];
    }): void;
    /**
     * Draw the continuous colored triangle on canvas
     */
    private drawContinuousTriangle;
    /**
     * Draw the triangle frame, axes and labels
     */
    private drawTriangleFrame;
    /**
     * Add data points to the visualization
     */
    private addDataPoints;
    /**
     * Convert ternary coordinates to SVG coordinates
     */
    private ternaryToSvgCoords;
    /**
     * Convert SVG coordinates to ternary coordinates
     */
    private svgToTernaryCoords;
}
