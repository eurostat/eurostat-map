import { interpolateLab } from 'd3-interpolate'

export const ternaryClassifier = (properties, totalFunction, opts = {}) => {
    //the three properties
    const p0 = properties[0],
        p1 = properties[1],
        p2 = properties[2]

    //the classifier center point. sum must be equal to 1
    const [c0, c1, c2] = opts.center || [1 / 3, 1 / 3, 1 / 3]

    //parameter to decide wether to use mixed classes m0, m1, m2.
    const withMixedClasses = opts.withMixedClasses != undefined ? opts.withMixedClasses : true

    //parameter to decide wether to use a central class, and the size of this central class.
    //set to 0 or undefined for not showing any central class. Set to 1 for a central class that contains the mix classes
    const cc = opts.centerCoefficient ? 1 - opts.centerCoefficient : undefined

    //the output classifier method
    const fun = (c) => {
        //get total
        const tot = totalFunction(c)
        if (!tot) return undefined
        //compute shares
        const [s0, s1, s2] = [+c[p0] / tot, +c[p1] / tot, +c[p2] / tot]

        //class 0
        if (s0 >= c0 && s1 <= c1 && s2 <= c2) {
            //central class near class 0
            if (cc != undefined && (s2 - c2) * (c1 - cc * c1) >= (s1 - cc * c1) * (cc * c2 - c2)) return 'center'
            return '0'
        }
        //class 1
        if (s0 <= c0 && s1 >= c1 && s2 <= c2) {
            //central class near class 1
            if (cc != undefined && (s2 - c2) * (c0 - cc * c0) >= (s0 - cc * c0) * (cc * c2 - c2)) return 'center'
            return '1'
        }
        //class 2
        if (s0 <= c0 && s1 <= c1 && s2 >= c2) {
            //central class near class 2
            if (cc != undefined && (s1 - c1) * (c0 - cc * c0) >= (s0 - cc * c0) * (cc * c1 - c1)) return 'center'
            return '2'
        }
        //middle class 0 - intersection class 1 and 2
        if (s0 <= c0 && s1 >= c1 && s2 >= c2) {
            //central class
            if (cc != undefined && s0 > cc * c0) return 'center'
            if (withMixedClasses) return 'm12'
            return s1 > s2 ? '1' : '2'
        }
        //middle class 1 - intersection class 0 and 1
        if (s0 >= c0 && s1 <= c1 && s2 >= c2) {
            //central class
            if (cc != undefined && s1 > cc * c1) return 'center'
            if (withMixedClasses) return 'm02'
            return s0 > s2 ? '0' : '2'
        }
        //middle class 2 - intersection class 0 and 1
        if (s0 >= c0 && s1 >= c1 && s2 <= c2) {
            //central class
            if (cc != undefined && s2 > cc * c2) return 'center'
            if (withMixedClasses) return 'm01'
            return s1 > s0 ? '1' : '0'
        }
        //should not happen
        return 'unknown'
    }

    //attach information to output function
    fun.center = [c0, c1, c2]
    fun.centerCoefficient = opts.centerCoefficient

    return fun
}

export const ternaryColorClassifier = (properties, totalFunction, colors, opts = {}) => {
    //the three colors
    const [color0, color1, color2] = colors || ['red', 'green', 'blue']

    //the color interpolation function
    const colorInterpolation = opts.colorInterpolation || interpolateLab

    //parameter to decide wether to use mixed classes.
    const withMixedClasses = opts.withMixedClasses != undefined ? opts.withMixedClasses : true
    //https://d3js.org/d3-interpolate/color
    const mixColorFunction = (color1, color2) => colorInterpolation(color1, color2)(0.5)
    //the colors corresponding to the mixed classes
    const [mixColor0, mixColor1, mixColor2] =
        opts.mixedColors || withMixedClasses
            ? [mixColorFunction(color1, color2), mixColorFunction(color0, color2), mixColorFunction(color0, color1)]
            : []

    //the central color, used for the central class, if any. The central class is the class of relatively balanced values, around the center point
    const centerColor = opts.centerColor || colorInterpolation(mixColorFunction(color0, color1), color2)(0.333)

    //make classifier
    const classifier = ternaryClassifier(properties, totalFunction, opts)

    //the output color classifier method
    const fun = (c) => {
        const cla = classifier(c)
        if (cla == '0') return color0
        if (cla == '1') return color1
        if (cla == '2') return color2
        if (cla == 'm12') return mixColor0
        if (cla == 'm02') return mixColor1
        if (cla == 'm01') return mixColor2
        if (cla == 'center') return centerColor
        return opts.defaultColor || 'black'
    }
    fun.center = classifier.center
    fun.centerCoefficient = opts.centerCoefficient
    fun.colors = [color0, color1, color2]
    fun.mixColors = [mixColor0, mixColor1, mixColor2]
    fun.centerColor = centerColor
    fun.classifier = classifier

    return fun
}
