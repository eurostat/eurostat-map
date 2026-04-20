declare class a {
    static colorMapTricolore(t: any, a?: number[], n?: number, s?: number, o?: number, i?: number, h?: number, c?: number): any;
    static colorMapSextant(t: any, a?: number[], n?: string[]): any;
    static hclToHex(t: any, r: any, e: any): string;
}
declare class r {
    static geometricMean(t: any, r?: boolean): number;
    static centre(t: any): number[];
    static perturbe(t: any, r?: number[]): any;
    static powerScale(t: any, r?: number): any;
    static close(t: any): any;
    static validateTernaryPoints(t: any): void;
    static isValidTernary(t: any): boolean;
}
declare class e {
    static ternaryMeshCentroids(t: any): {
        id: number;
        p1: number;
        p2: number;
        p3: number;
    }[];
    static ternaryMeshVertices(t: any): any[];
    static ternaryDistance(t: any, r: any): any;
    static ternaryNearest(t: any, r: any): any;
    static ternarySextantVertices(t: any): {
        id: number;
        vertex: number;
        p1: any;
        p2: any;
        p3: any;
    }[];
    static ternarySurroundingSextant(t: any, r: any): any;
    static ternaryToCartesian(t: any): number[];
    static cartesianToTernary(t: any, r: any): number[];
    static ternaryLimits(t: any): {
        lower: number[];
        upper: number[];
    };
}
declare class n {
    constructor(r: any, e?: number, a?: number, n?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    });
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    container: any;
    width: number;
    height: number;
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    svg: any;
    triangle: any;
    legend: any;
    circles: any;
    createContinuousPlot(r?: any[], e?: {}): void;
    createDiscretePlot(r?: any[], n?: {}): void;
    createSextantPlot(r?: any[], a?: {}): void;
    drawContinuousTriangle(t: any, r: any, e: any, n: any, s: any, o: any, i: any): void;
    drawTriangleFrame(t: any, r: any, e: any, a: any, n: any, s?: string): void;
    addDataPoints(t: any, e: any): void;
    ternaryToSvgCoords(t: any, r: any): number[];
    svgToTernaryCoords(t: any, r: any): number[];
}
declare function s(t: any, r?: {}): any;
declare function o(t: any, r?: {}): any;
declare function i(t: any, r?: {}): any;
declare function h(t: any, r?: {}): any;
export { a as ColorMapping, r as CompositionUtils, e as TernaryGeometry, n as TricoloreViz, s as tricolore, o as tricoloreDetailed, i as tricoloreSextant, h as tricoloreSextantDetailed };
//# sourceMappingURL=tricolore_dist.d.ts.map