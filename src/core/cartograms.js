import { select, selectAll } from 'd3-selection'
import { csvParseRows } from 'd3-dsv'

// draw grid cartogram geometries
export const buildGridCartogramBase = function (out) {
    const zoomGroup = select(`#em-zoom-group-${out.svgId_}`)
    const gridGroup = zoomGroup.append('g').attr('id', 'em-grid-container')

    // Ensure margins exist with default values
    out.gridCartogramMargins_ = out.gridCartogramMargins_ || { top: 80, right: 80, bottom: 80, left: 80 }

    // Get grid layout
    const gridLayout = getGridLayout(out)
    const position = parseGridLayout(gridLayout)
    const gridData = getGridData(position, out)

    // Draw the appropriate grid
    if (out.gridCartogramShape_ === 'hexagon') {
        drawHexagonGrid(gridGroup, gridData, out)
    } else {
        drawSquareGrid(gridGroup, gridData, out)
    }

    // Center the grid
    centerGrid(gridGroup, out.width_, out.height_, out.gridCartogramMargins_)
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

    return out.gridCartogramPositions_ || (out.gridCartogramShape_ === 'hexagon' ? hexagonGrid : squareGrid)
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

    const margins = out.gridCartogramMargins_
    const cellPadding = out.gridCartogramCellPadding_ || 0 // Keep cell padding

    const cellWidth = (out.width_ - margins.left - margins.right) / numCols - cellPadding
    const cellHeight = (out.height_ - margins.top - margins.bottom) / numRows - cellPadding
    const cellSize = Math.min(cellWidth, cellHeight)

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
                .attr('class', 'em-grid-text')
                .attr('text-anchor', 'middle')
                .style('font-size', getFontSize(out._mapType))
                .style('transform', getLabelTranslate(out._mapType))
                .style('pointer-events', 'none')
                .attr('fill', 'black')
                .text(d.id)
                .attr('x', cellSize / 2)
                .attr('y', cellSize / 2 + 5)
        })
}

/** Draws a hexagon grid */
const drawHexagonGrid = (gridGroup, gridData, out) => {
    const numCols = Math.max(...gridData.map((d) => d.col)) + 1
    const numRows = Math.max(...gridData.map((d) => d.row)) + 1

    const margins = out.gridCartogramMargins_
    const cellPadding = out.gridCartogramCellPadding_ || 0 // Keep cell padding

    const baseHexRadius = Math.min(
        (out.width_ - margins.left - margins.right) / (numCols * 1.5),
        (out.height_ - margins.top - margins.bottom) / (numRows * Math.sqrt(3))
    )

    const hexRadius = baseHexRadius
    const hexHeight = Math.sqrt(3) * hexRadius

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
                .attr('class', 'em-grid-text')
                .attr('text-anchor', 'middle')
                .style('font-size', getFontSize(out._mapType))
                .style('transform', getLabelTranslate(out._mapType))
                .style('pointer-events', 'none')
                .attr('fill', 'black')
                .text(d.id)
                .attr('y', 5)
        })
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
