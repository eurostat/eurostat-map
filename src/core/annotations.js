import {
    annotation,
    annotationLabel,
    annotationCalloutRect,
    annotationCalloutCircle,
    annotationXYThreshold,
} from 'd3-svg-annotation'

export function appendAnnotations(svgElement, annotationsConfig) {
    // Define a map that maps the type string to the corresponding annotation function
    const annotationTypeMap = {
        annotationLabel: annotationLabel,
        annotationCalloutRect: annotationCalloutRect,
        annotationCalloutCircle: annotationCalloutCircle,
        annotationXYThreshold: annotationXYThreshold, // Add any other types you need
    }

    // Map annotations data to ensure each annotation has the proper function
    const annotationsWithTypes = annotationsConfig.annotations.map((d) => {
        // Replace the 'type' string with the corresponding annotation function
        const annotationType = annotationTypeMap[d.type] || annotationLabel // Default to annotationLabel
        return { ...d, type: annotationType } // Update 'type' with the function reference
    })
    const makeAnnotations = annotation().type(annotationLabel).annotations(annotationsWithTypes).editMode(annotationsConfig.editMode)

    //clear previous
    svgElement.selectAll('.em-annotation-group').remove()
    svgElement.append('g').attr('class', 'em-annotation-group').call(makeAnnotations)
}
