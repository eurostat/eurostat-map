import {
    annotation,
    annotationLabel,
    annotationCallout,
    annotationCalloutRect,
    annotationCalloutCircle,
    annotationXYThreshold,
} from 'd3-svg-annotation'

export function appendAnnotations(map) {
    if (map.svg_) {
        const zoomGroup = map.svg_.select('#em-zoom-group-' + map.svgId_)
        //clear previous
        zoomGroup.selectAll('.em-annotations').remove()

        const annotationsConfig = map.annotations_

        if (annotationsConfig) {
            // Define a map that maps the type string to the corresponding annotation function
            const annotationTypeMap = {
                annotationLabel: annotationLabel,
                annotationCallout: annotationCallout,
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

            // append new
            zoomGroup.append('g').attr('id', 'em-annotations').attr('class', 'em-annotations').call(makeAnnotations)
        }
    }
}
