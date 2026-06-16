function parseTranslateValue(transformValue) {
    if (!transformValue) return null
    const match = transformValue.match(/translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/)
    return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null
}

function getAnnotationClassName(annotationNode) {
    if (!annotationNode) return ''

    const classes = Array.from(annotationNode.classList || []).filter((cls) => cls !== 'annotation' && cls !== 'editable' && cls !== 'selected')

    return classes.join(' ').trim()
}

function findAnnotationMatchIndex(sourceAnnotations, title, className, fallbackIndex) {
    if (!Array.isArray(sourceAnnotations) || sourceAnnotations.length === 0) return -1

    if (title) {
        const titleIndex = sourceAnnotations.findIndex((annotation) => {
            const noteTitle = annotation?.note?.title
            return typeof noteTitle === 'string' && noteTitle.trim() === title
        })
        if (titleIndex !== -1) return titleIndex
    }

    if (className) {
        const classIndex = sourceAnnotations.findIndex((annotation) => {
            const storedClassName = (annotation?.className || '').trim()
            return storedClassName === className
        })
        if (classIndex !== -1) return classIndex
    }

    return fallbackIndex < sourceAnnotations.length ? fallbackIndex : -1
}

function generateMapAnnotations(annotations) {
    const source = annotations || window.ch11M04Annotations || []

    const cloned = source.map((annotation) => {
        const copy = { ...annotation }
        copy.note = annotation?.note ? { ...annotation.note } : {}
        return copy
    })

    const root = document.querySelector('.annotations') || document
    const nodes = Array.from(root.querySelectorAll('.annotation'))

    nodes.forEach((node, index) => {
        const titleElement = node.querySelector('.annotation-note-title tspan') || node.querySelector('.annotation-note-title')
        const title = titleElement ? (titleElement.textContent || '').trim() : ''

        const className = getAnnotationClassName(node)

        const groupPosition = parseTranslateValue(node.getAttribute('transform') || '')

        const noteElement = node.querySelector('.annotation-note')
        let notePosition = parseTranslateValue(noteElement?.getAttribute('transform') || '')

        if (!notePosition && noteElement) {
            const content = noteElement.querySelector('.annotation-note-content')
            notePosition = parseTranslateValue(content?.getAttribute('transform') || '')
        }

        const targetIndex = findAnnotationMatchIndex(cloned, title, className, index)
        if (targetIndex === -1) {
            console.warn('No annotation match found for node:', title || className || index)
            return
        }

        if (groupPosition) {
            cloned[targetIndex].x = groupPosition.x
            cloned[targetIndex].y = groupPosition.y
        }

        if (notePosition) {
            cloned[targetIndex].dx = notePosition.x
            cloned[targetIndex].dy = notePosition.y
        } else {
            if (cloned[targetIndex].dx == null) cloned[targetIndex].dx = 0
            if (cloned[targetIndex].dy == null) cloned[targetIndex].dy = 0
        }
    })

    return cloned
}

function downloadAnnotationsJSON(data, filename) {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()

    setTimeout(() => {
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
    }, 0)
}

window.generateMapAnnotations = generateMapAnnotations
window.downloadAnnotationsJSON = downloadAnnotationsJSON
