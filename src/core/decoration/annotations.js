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
            const makeAnnotations = annotation().annotations(annotationsWithTypes).editMode(annotationsConfig.editMode)

            // append new
            const annotationsGroup = zoomGroup.append('g').attr('id', 'em-annotations').attr('class', 'em-annotations').call(makeAnnotations)

            // note.textAlign: d3-svg-annotation's note.align only places the note box relative to its anchor point and always
            // left-aligns the lines inside it, so right/middle alignment of the lines is applied to the drawn notes here
            annotationsGroup.selectAll('g.annotation').each(function (d) {
                const textAlign = d?.note?.textAlign
                if (textAlign !== 'right' && textAlign !== 'middle') return
                const content = this.querySelector('.annotation-note-content')
                const background = content?.querySelector('.annotation-note-bg')
                if (!background) return
                const width = Number(background.getAttribute('width'))
                const x = textAlign === 'right' ? width : width / 2
                content.querySelectorAll('text').forEach((text) => {
                    text.setAttribute('text-anchor', textAlign === 'right' ? 'end' : 'middle')
                    text.querySelectorAll('tspan').forEach((tspan) => tspan.setAttribute('x', x))
                })
            })
        }
    }
}
