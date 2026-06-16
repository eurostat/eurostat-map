import { select } from 'd3-selection'
import { csvParseRows } from 'd3-dsv'

const COUNTRY_CODE_ALIASES = {
    EL: 'GR',
    UK: 'GB',
}

const COUNTRY_NAME_OVERRIDES = {
    BA: 'Bosnia & H.',
    MK: 'N. Macedonia',
}

const englishRegionNames =
    typeof Intl !== 'undefined' && Intl.DisplayNames
        ? new Intl.DisplayNames(['en'], { type: 'region' })
        : null

// draw grid cartogram geometries
export const buildGridCartogramBase = function (out) {
    const zoomGroup = select(`#em-zoom-group-${out.svgId_}`)
    const gridGroup = zoomGroup.append('g').attr('id', 'em-grid-container')

    // Ensure margins exist with default values
    out.gridCartogramSettings_ = out.gridCartogramSettings_ || {}
    out.gridCartogramSettings_.margins = out.gridCartogramSettings_.margins || { top: 80, right: 80, bottom: 80, left: 80 }
    out.gridCartogramSettings_.chartOffset = out.gridCartogramSettings_.chartOffset || { x: 0, y: 0 }

    // Get grid layout
    const gridLayout = getGridLayout(out)
    const position = parseGridLayout(gridLayout)
    const gridData = getGridData(position, out)

    // Draw the appropriate grid
    if (out.gridCartogramSettings_.shape === 'hexagon') {
        drawHexagonGrid(gridGroup, gridData, out)
    } else {
        drawSquareGrid(gridGroup, gridData, out)
    }

    // Center the grid
    centerGrid(gridGroup, out.width_, out.height_, out.gridCartogramSettings_.margins)

    // Fit labels after centering so country names do not overlap their neighbors.
    fitGridCartogramLabels(gridGroup, out)
}

export function getGridCartogramChartOffset(map) {
    const offset = map?.gridCartogramSettings_?.chartOffset || {}
    return {
        x: Number.isFinite(+offset.x) ? +offset.x : 0,
        y: Number.isFinite(+offset.y) ? +offset.y : 0,
    }
}

export function getGridCartogramChartAnchor(map, bbox) {
    const isHexagon = map.gridCartogramSettings_?.shape === 'hexagon'
    const offset = getGridCartogramChartOffset(map)
    const x = (isHexagon ? 0 : bbox.width / 2) + offset.x
    const y = (isHexagon ? 0 : bbox.height / 2) + offset.y
    return { x, y }
}

/** Determines the grid layout based on settings */
const getGridLayout = (out) => {
    const squareGrid = `
        ,IS,  ,  ,NO,SE,FI,  ,  ,  ,  ,  ,
        ,  ,  ,  ,  ,  ,  ,EE,  ,  ,  ,  ,
        ,  ,  ,  ,  ,  ,  ,LV,  ,  ,  ,  ,
        ,IE,UK,  ,  ,DK,  ,LT,  ,  ,  ,  ,
        ,  ,  ,  ,NL,DE,PL,  ,  ,  ,  ,  ,
        ,  ,  ,BE,LU,CZ,SK,UA,  ,  ,  ,  ,
        ,  ,FR,CH,LI,AT,HU,RO,MD,  ,  ,  ,
        ,PT,ES,  ,IT,SI,HR,RS,BG,  ,  ,  ,
        ,  ,  ,  ,  ,  ,BA,ME,MK,  ,  ,  ,  
        ,  ,  ,  ,  ,  ,  ,AL,EL,TR,GE,  ,  
        ,  ,  ,  ,MT,  ,  ,  ,  ,CY,  ,  ,  `

    const hexagonGrid = `
        ,IS,  ,  ,  ,  ,  ,  ,  ,  ,  ,  ,
        ,  ,  ,  ,NO,SE,FI,EE,  ,  ,  ,  ,
        ,  ,  ,  ,  ,  ,  ,LV,  ,  ,  ,  ,
        ,IE,UK,  ,  ,DK,  ,LT,  ,  ,  ,  ,
        ,  ,  ,  ,NL,DE,PL,  ,  ,  ,  ,  ,
        ,  ,  ,BE,LU,CZ,SK,UA,  ,  ,  ,  ,
        ,  ,FR,CH,LI,AT,HU,RO,MD,  ,  ,  ,
        ,PT,ES,  ,IT,SI,HR,RS,BG,  ,  ,  ,
        ,  ,  ,  ,  ,  ,BA,ME,MK,  ,  ,  ,  
        ,  ,  ,  ,  ,  ,  ,AL,EL,TR,GE,  ,  
        ,  ,  ,  ,MT,  ,  ,  ,  ,CY,  ,  ,  `

    return out.gridCartogramSettings_.positions || (out.gridCartogramSettings_.shape === 'hexagon' ? hexagonGrid : squareGrid)
}

/** Parses the grid layout and maps each ID to its position */
const parseGridLayout = (gridLayout) => {
    const positionById = new Map()
    csvParseRows(gridLayout.trim(), (row, j) => {
        row.forEach((id, i) => {
            if ((id = id.trim())) {
                positionById.set(id, [i, j])
            }
        })
    })
    return positionById
}

/** Converts parsed positions into structured grid data */
const getGridData = (position, out) => {
    return Array.from(position, ([id, [col, row]]) => {
        const feature = out.Geometries.geoJSONs.nutsrg.find((rg) => rg.properties.id == id)
        return {
            id,
            col,
            row,
            properties: {
                id: id,
                name: feature ? feature.properties.na : '',
            },
        }
    })
}

/** Draws a square grid */
const drawSquareGrid = (gridGroup, gridData, out) => {
    const numCols = Math.max(...gridData.map((d) => d.col)) + 1
    const numRows = Math.max(...gridData.map((d) => d.row)) + 1

    const margins = out.gridCartogramSettings_.margins
    const cellPadding = out.gridCartogramSettings_.cellPadding || 0 // Keep cell padding

    const cellWidth = (out.width_ - margins.left - margins.right) / numCols - cellPadding
    const cellHeight = (out.height_ - margins.top - margins.bottom) / numRows - cellPadding
    const cellSize = Math.min(cellWidth, cellHeight)
    const labelFontSize = getGridCountryLabelFontSize(out, cellSize)

    gridGroup
        .selectAll('.em-grid-cell')
        .data(gridData)
        .enter()
        .append('g')
        .attr('class', 'em-grid-cell')
        .attr('transform', (d) => `translate(${d.col * (cellSize + cellPadding) + margins.left}, ${d.row * (cellSize + cellPadding) + margins.top})`)
        .each(function (d) {
            select(this)
                .append('rect')
                .datum(d) // Explicitly bind data to shape for mouse events
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('class', 'em-grid-rect em-grid-shape')

            select(this)
                .append('text')
                .attr('id', `em-grid-text-${d.id}`)
                .attr('class', 'em-grid-text')
                .attr('text-anchor', 'middle')
                .style('font-size', `${labelFontSize}px`)
                .style('transform', getLabelTranslate(out._mapType))
                .style('pointer-events', 'none')
                .attr('fill', 'black')
                .text(getGridCountryLabelText(out, d))
                .attr('x', cellSize / 2)
                .attr('y', cellSize / 2 + 5)
        })
}

/** Draws a hexagon grid */
const drawHexagonGrid = (gridGroup, gridData, out) => {
    const numCols = Math.max(...gridData.map((d) => d.col)) + 1
    const numRows = Math.max(...gridData.map((d) => d.row)) + 1

    const margins = out.gridCartogramSettings_.margins
    const cellPadding = out.gridCartogramSettings_.cellPadding || 0 // Keep cell padding

    const baseHexRadius = Math.min(
        (out.width_ - margins.left - margins.right) / (numCols * 1.5),
        (out.height_ - margins.top - margins.bottom) / (numRows * Math.sqrt(3))
    )

    const hexRadius = baseHexRadius
    const hexHeight = Math.sqrt(3) * hexRadius
    const labelFontSize = getGridCountryLabelFontSize(out, hexRadius * 2)

    gridGroup
        .selectAll('.em-grid-cell')
        .data(gridData)
        .enter()
        .append('g')
        .attr('class', 'em-grid-cell')
        .attr('transform', (d) => {
            const x = d.col * (1.5 * hexRadius + cellPadding) + margins.left
            const y = d.row * (hexHeight + cellPadding) + (d.col % 2 === 1 ? (hexHeight + cellPadding) / 2 : 0) + margins.top
            return `translate(${x}, ${y})`
        })
        .each(function (d) {
            // Append hexagon shape as background (first child)
            select(this)
                .append('path')
                .datum(d) // Explicitly bind data to shape for mouse events
                .attr('d', drawHexagon(hexRadius))
                .attr('class', 'em-grid-hexagon em-grid-shape')

            // Append text label
            select(this)
                .append('text')
                .attr('id', `em-grid-text-${d.id}`)
                .attr('class', 'em-grid-text')
                .attr('text-anchor', 'middle')
                .style('font-size', `${labelFontSize}px`)
                .style('transform', getLabelTranslate(out._mapType))
                .style('pointer-events', 'none')
                .attr('fill', 'black')
                .text(getGridCountryLabelText(out, d))
                .attr('y', 5)
        })
}

const getGridCountryLabelText = (out, d) => {
    const labelSettings = getGridCountryLabelSettings(out)
    const labelMode = labelSettings.countryLabels || 'code'

    if (typeof labelMode === 'function') {
        return labelMode(d.id, d.properties?.name, d)
    }

    if (labelMode === 'name') {
        return getEnglishCountryName(d.id, d.properties?.name)
    }

    return d.id
}

const getEnglishCountryName = (id, fallbackName) => {
    if (!englishRegionNames || !id) return fallbackName || id

    const canonicalCode = COUNTRY_CODE_ALIASES[id] || id
    if (COUNTRY_NAME_OVERRIDES[canonicalCode]) return COUNTRY_NAME_OVERRIDES[canonicalCode]

    const englishName = englishRegionNames.of(canonicalCode)

    // Intl may return the original code if unknown (e.g. some non-ISO identifiers).
    if (!englishName || englishName === canonicalCode) return fallbackName || id
    return englishName
}

const getGridCountryLabelFontSize = (out, maxWidth) => {
    const settings = getGridCountryLabelSettings(out)
    const baseFontSize = settings.countryLabelFontSize || getFontSize(out._mapType)
    const mode = settings.countryLabels || 'code'

    if (mode === 'name') {
        const minFontSize = settings.countryLabelMinFontSize || 8
        const fitFontSize = Math.max(minFontSize, Math.min(baseFontSize, Math.floor(maxWidth / 4.8)))
        return fitFontSize
    }

    return baseFontSize
}

const fitGridCartogramLabels = (gridGroup, out) => {
    const settings = getGridCountryLabelSettings(out)
    const mode = settings.countryLabels || 'code'
    const shouldFit = settings.countryLabelAvoidOverlap !== false && mode === 'name'
    if (!shouldFit) return

    const minFontSize = settings.countryLabelMinFontSize || 8
    const padding = settings.countryLabelPadding ?? 4
    const labels = gridGroup.selectAll('.em-grid-cell .em-grid-text')

    labels.each(function () {
        const text = select(this)
        const cell = select(this.parentNode)
        const shape = cell.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
        if (!shape) return

        const shapeBBox = shape.getBBox()
        const availableWidth = Math.max(shapeBBox.width - padding * 2, 1)
        const currentFontSize = parseFloat(text.style('font-size')) || getFontSize(out._mapType)
        const currentLength = this.getComputedTextLength?.() || 0
        if (!currentLength) return

        let nextFontSize = currentFontSize

        if (currentLength > availableWidth) {
            nextFontSize = Math.max(minFontSize, Math.floor(currentFontSize * (availableWidth / currentLength)))
            text.style('font-size', `${nextFontSize}px`)
        }

        // Guarantee the name stays inside the cell even when the font cannot be reduced further.
        const appliedFontSize = parseFloat(text.style('font-size')) || nextFontSize
        const updatedLength = this.getComputedTextLength?.() || 0
        if (updatedFontNeedsStretch(updatedLength, availableWidth, appliedFontSize, minFontSize)) {
            text
                .attr('textLength', availableWidth)
                .attr('lengthAdjust', 'spacingAndGlyphs')
        }
    })
}

const getGridCountryLabelSettings = (out) => {
    const gridSettings = out.gridCartogramSettings_ || {}
    const legacyLabelSettings = {
        countryLabels: gridSettings.countryLabels,
        countryLabelFontSize: gridSettings.countryLabelFontSize,
        countryLabelMinFontSize: gridSettings.countryLabelMinFontSize,
        countryLabelPadding: gridSettings.countryLabelPadding,
        countryLabelAvoidOverlap: gridSettings.countryLabelAvoidOverlap,
    }

    return Object.assign({}, legacyLabelSettings, gridSettings.countryLabelSettings || {})
}

const updatedFontNeedsStretch = (textLength, availableWidth, fontSize, minFontSize) => {
    if (!textLength) return false
    return textLength > availableWidth && fontSize <= minFontSize
}

const getFontSize = (mapType) => {
    switch (mapType) {
        case 'sparkline':
        case 'spark':
            return 12
        case 'proportionalSymbol':
            return 14
        case 'choropleth':
            return 15
        default:
            return 12
    }
}

const getLabelTranslate = (mapType) => {
    switch (mapType) {
        case 'sparkline':
        case 'spark':
            return 'translate(0, -10px)'
        case 'proportionalSymbol':
            return 'translate(0, -12px)'
        case 'choropleth':
            return 'translate(0, 0px)'
        default:
            return 'translate(0, 0px)'
    }
}

/** Generates the hexagon path */
const drawHexagon = (r) => {
    const angle = Math.PI / 3
    return (
        Array.from({ length: 6 }, (_, i) => {
            const x = r * Math.cos(angle * i)
            const y = r * Math.sin(angle * i)
            return `${i === 0 ? 'M' : 'L'}${x},${y}`
        }).join(' ') + ' Z'
    )
}

/** Centers the grid within the SVG */
const centerGrid = (gridGroup, svgWidth, svgHeight, margins) => {
    gridGroup.each(function () {
        const bbox = this.getBBox()
        const dx = (svgWidth - margins.left - margins.right - bbox.width) / 2 - bbox.x + margins.left
        const dy = (svgHeight - margins.top - margins.bottom - bbox.height) / 2 - bbox.y + margins.top
        gridGroup.attr('transform', `translate(${dx}, ${dy})`)
    })
}

export function adjustGridCartogramTextLabels({ map, getAnchors, getRadius, margin = 2 }) {
    const isHexagon = map.gridCartogramSettings_.shape === 'hexagon'
    const anchors = getAnchors(map)

    anchors.each(function (d) {
        const cell = select(this)
        const text = cell.select('.em-grid-text')
        if (text.empty()) return

        const regionId = d.properties.id
        const r = getRadius(regionId, d)
        if (!r || r <= 0) {
            text.style('display', 'none')
            return
        }

        text.style('display', null)

        const shapeEl = cell.select('.em-grid-shape, .em-grid-rect, .em-grid-hexagon').node()
        if (!shapeEl) return

        const bbox = shapeEl.getBBox()
        const centerY = isHexagon ? 0 : bbox.height / 2

        const textY = centerY - r - margin
        text.attr('y', textY)
    })
}
