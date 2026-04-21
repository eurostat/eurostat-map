export function ternaryClassifier(properties: any, totalFunction: any, opts?: {}): {
    (c: any): "0" | "center" | "1" | "2" | "m12" | "m02" | "m01" | "unknown";
    center: any[];
    centerCoefficient: any;
};
export function ternaryColorClassifier(properties: any, totalFunction: any, colors: any, opts?: {}): {
    (c: any): any;
    center: any[];
    centerCoefficient: any;
    colors: any[];
    mixColors: any[];
    centerColor: any;
    classifier: {
        (c: any): "0" | "center" | "1" | "2" | "m12" | "m02" | "m01" | "unknown";
        center: any[];
        centerCoefficient: any;
    };
};
//# sourceMappingURL=ternary-utils.d.ts.map