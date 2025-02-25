import { select, selectAll } from 'd3-selection'
import { csvParseRows } from 'd3-dsv'

// draw grid cartogram geometries
export const buildGridCartogramBase = function (out) {
    const zoomGroup = select('#em-zoom-group-' + out.svgId_)
    const gridGroup = zoomGroup.append('g').attr('id', 'em-grid-container')

    const svgWidth = out.width_
    const svgHeight = out.height_
    const cellPadding = out.gridCartogramCellPadding_ || 0
    const containerPadding = out.gridCartogramContainerPadding_ || 80
    const hexagonGrid = `
        ,IS,  ,  ,  ,NO,SE,FI,  ,  ,  ,  ,
        ,  ,  ,  ,  ,  ,  ,  ,,  ,  ,  ,
        ,  ,  ,  ,  ,  ,  ,  ,EE,  ,  ,  ,
        ,IE,UK,  ,  ,DK,  ,LT, LV ,  ,  ,  ,
        ,  ,  ,  ,NL,DE,PL,  ,  ,  ,  ,  ,
        ,  ,  ,BE,LU,CZ,SK,UA,  ,  ,  ,  ,
        ,  ,FR,CH,LI,AT,HU,RO,MD,  ,  ,  ,
        ,PT,ES,  ,IT,SI,HR,RS,BG,  ,  ,  ,
        ,  ,  ,  ,  ,  ,BA,ME,MK,  ,  ,  ,  
        ,  ,  ,  ,  ,  ,  ,AL,EL,TR,  ,  ,  
        ,  ,  ,  ,MT,  ,  ,  ,  ,CY,  ,  ,  `

    const squareGrid = `
        ,IS,  ,  ,  ,NO,SE,FI,  ,  ,  ,  ,
        ,  ,  ,  ,  ,  ,  ,  ,EE,  ,  ,  ,
        ,  ,  ,  ,  ,  ,  ,  ,LV,  ,  ,  ,
        ,IE,UK,  ,  ,DK,  ,LT,  ,  ,  ,  ,
        ,  ,  ,  ,NL,DE,PL,  ,  ,  ,  ,  ,
        ,  ,  ,BE,LU,CZ,SK,UA,  ,  ,  ,  ,
        ,  ,FR,CH,LI,AT,HU,RO,MD,  ,  ,  ,
        ,PT,ES,  ,IT,SI,HR,RS,BG,  ,  ,  ,
        ,  ,  ,  ,  ,  ,BA,ME,MK,  ,  ,  ,  
        ,  ,  ,  ,  ,  ,  ,AL,EL,TR,  ,  ,  
        ,  ,  ,  ,MT,  ,  ,  ,  ,CY,  ,  ,  `

    const defaultLayout = out.gridCartogramShape_ == 'hexagon' ? hexagonGrid : squareGrid
    const gridLayout = out.gridCartogramPositions_ || defaultLayout

    const grid = (gridLayout) => {
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

    const position = grid(gridLayout)

    const gridData = Array.from(position, ([id, [col, row]]) => {
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

    const drawSquareGrid = () => {
        const numCols = Math.max(...gridData.map((d) => d.col)) + 1
        const numRows = Math.max(...gridData.map((d) => d.row)) + 1

        const cellWidth = (svgWidth - 2 * containerPadding) / numCols - cellPadding
        const cellHeight = (svgHeight - 2 * containerPadding) / numRows - cellPadding
        const cellSize = Math.min(cellWidth, cellHeight)

        gridGroup
            .selectAll('.em-grid-cell')
            .data(gridData)
            .enter()
            .append('g')
            .attr('class', 'em-grid-cell')
            .attr(
                'transform',
                (d) => `translate(${d.col * (cellSize + cellPadding) + containerPadding}, ${d.row * (cellSize + cellPadding) + containerPadding})`
            )
            .each(function (d) {
                select(this).append('rect').attr('width', cellSize).attr('height', cellSize).attr('fill', out.defa).attr('class', 'em-grid-rect')

                select(this)
                    .append('text')
                    .attr('class', 'em-grid-text')
                    .attr('text-anchor', 'middle')
                    .attr('font-size', 15)
                    .style('pointer-events', 'none')
                    .attr('fill', 'black')
                    .text(d.id)
                    .attr('x', cellSize / 2)
                    .attr('y', cellSize / 2 + 5)
            })
    }

    const drawHexagonGrid = () => {
        const numCols = Math.max(...gridData.map((d) => d.col)) + 1
        const numRows = Math.max(...gridData.map((d) => d.row)) + 1

        const baseHexRadius = Math.min(
            (svgWidth - 2 * containerPadding) / (numCols * 1.5),
            (svgHeight - 2 * containerPadding) / (numRows * Math.sqrt(3))
        )

        const hexRadius = baseHexRadius //- cellPadding / 3
        const hexHeight = Math.sqrt(3) * hexRadius

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

        gridGroup
            .selectAll('.em-grid-cell')
            .data(gridData)
            .enter()
            .append('g')
            .attr('class', 'em-grid-cell')
            .attr('transform', (d) => {
                const x = d.col * (1.5 * hexRadius + cellPadding) + containerPadding
                const y = d.row * (hexHeight + cellPadding) + (d.col % 2 === 1 ? (hexHeight + cellPadding) / 2 : 0) + containerPadding
                return `translate(${x}, ${y})`
            })
            .each(function (d) {
                select(this).append('path').attr('d', drawHexagon(hexRadius)).attr('fill', out.defa).attr('class', 'em-grid-hexagon')

                select(this)
                    .append('text')
                    .attr('class', 'em-grid-text')
                    .attr('text-anchor', 'middle')
                    .attr('font-size', 15)
                    .style('pointer-events', 'none')
                    .attr('fill', 'black')
                    .text(d.id)
                    .attr('y', 5)
            })
    }

    if (out.gridCartogramShape_ === 'hexagon') {
        drawHexagonGrid()
    } else {
        drawSquareGrid()
    }

    gridGroup.each(function () {
        const bbox = this.getBBox()
        const dx = (svgWidth - bbox.width) / 2 - bbox.x
        const dy = (svgHeight - bbox.height) / 2 - bbox.y
        gridGroup.attr('transform', `translate(${dx}, ${dy})`)
    })
}
