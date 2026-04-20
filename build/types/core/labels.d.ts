/**
 * Add labels for data points.
 * @param {Object} svg - D3 selection of the SVG element.
 */
export function addFlowValueLabels(out: any, svg: any): void;
export function addLabelsToMap(map: any, zg: any): void;
export function appendLabelsToSymbols(map: any, sizeData: any, out: any): void;
export function updateLabels(map: any): void;
export function updateValuesLabels(map: any): any;
export function statLabelsTextFunction(d: any, statData: any, map: any): string;
export namespace DEFAULTLABELS {
    namespace EUR_3035 {
        let cc: ({
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        } | {
            text: string;
            x: number;
            y: number;
            class: string;
            size?: undefined;
        })[];
        let en: ({
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
            letterSpacing: number;
            rotate?: undefined;
            cc?: undefined;
        } | {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
            letterSpacing?: undefined;
            rotate?: undefined;
            cc?: undefined;
        } | {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
            rotate: number;
            letterSpacing?: undefined;
            cc?: undefined;
        } | {
            text: string;
            cc: string;
            x: number;
            y: number;
            class: string;
            size: number;
            rotate: number;
            letterSpacing?: undefined;
        } | {
            text: string;
            cc: string;
            x: number;
            y: number;
            class: string;
            size: number;
            letterSpacing?: undefined;
            rotate?: undefined;
        })[];
    }
    namespace IC_32628 {
        let cc_1: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_1 as cc };
        let en_1: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_1 as en };
    }
    namespace GP_32620 {
        let cc_2: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_2 as cc };
        let en_2: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_2 as en };
    }
    namespace MQ_32620 {
        let cc_3: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_3 as cc };
        let en_3: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_3 as en };
    }
    namespace GF_32622 {
        let cc_4: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_4 as cc };
        let en_4: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_4 as en };
    }
    namespace RE_32740 {
        let cc_5: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_5 as cc };
        let en_5: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_5 as en };
    }
    namespace YT_32738 {
        let cc_6: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_6 as cc };
        let en_6: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_6 as en };
    }
    namespace MT_3035 {
        let cc_7: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_7 as cc };
        let en_7: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_7 as en };
    }
    namespace PT20_32626 {
        let cc_8: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_8 as cc };
        let en_8: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_8 as en };
    }
    namespace PT30_32628 {
        let cc_9: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
            rotate: number;
        }[];
        export { cc_9 as cc };
        let en_9: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
            rotate: number;
        }[];
        export { en_9 as en };
    }
    namespace LI_3035 {
        let cc_10: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_10 as cc };
        let en_10: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_10 as en };
    }
    namespace IS_3035 {
        let cc_11: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_11 as cc };
        let en_11: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_11 as en };
    }
    namespace SJ_SV_3035 {
        let cc_12: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_12 as cc };
        let en_12: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_12 as en };
    }
    namespace SJ_JM_3035 {
        let cc_13: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_13 as cc };
        let en_13: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_13 as en };
    }
    namespace CARIB_32620 {
        let cc_14: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { cc_14 as cc };
        let en_14: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
        }[];
        export { en_14 as en };
    }
    namespace WORLD_54030 {
        let en_15: {
            text: string;
            x: number;
            y: number;
            class: string;
            size: number;
            letterSpacing: number;
        }[];
        export { en_15 as en };
    }
}
//# sourceMappingURL=labels.d.ts.map