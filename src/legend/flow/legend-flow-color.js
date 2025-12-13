import { select, selectAll } from 'd3-selection'

// explain flow line colors
export function drawFlowColorLegend(out, x, y) {
    const map = out.map

    // Create/clear container
    out._flowColorContainer?.remove()
    out._flowColorContainer = out.lgg
        .append('g')
        .attr('class', 'em-flow-color-legend')
        .attr('transform', `translate(${x}, ${y})`)

    const title = out._flowColorContainer
        .append('text')
        .attr('class', 'em-color-legend-title')
        .attr('id', 'em-color-legend-title')
        .attr('dy', '0.35em')
        .text(out.flowColorLegend.title || 'Destination')

    let legendItems = [];
    if (typeof map.flowColor_ === 'function') {
        if (out.flowColorLegend.items && out.flowColorLegend.items.length > 0) {
            // allow user-provided items; add key if provided
            legendItems = out.flowColorLegend.items.map(d => ({ label: d.label, color: d.color, key: d.key ?? null }));
        } else {
            legendItems = [{ label: "please specify legend items ...", color: "#888", key: null }];
        }
    } else {
        // “top destinations” case
        const colorScale = map.topLocationColorScale;
        const topKeys = Array.from(map.topLocationKeys || []);
        legendItems = topKeys.map(key => ({
            key,                                 // <<< NEW: stable key for matching
            label: map.nodeNameMap.get(key) || key,
            color: colorScale(key),
        }));
        legendItems.push({ key: 'Other', label: 'Other', color: map.flowColor_ });
    }

    // Draw each legend row
    const titleOffset = title.node().getBBox().height + out.flowColorLegend.titlePadding

    // Draw legend rows with mouseover
    const itemHeight = 22
    const itemWidth = out.itemHeight || 18
    legendItems.forEach((item, i) => {
        const row = out._flowColorContainer
            .append('g')
            .attr('class', 'em-color-legend-item')
            .attr('transform', `translate(0, ${i * 22 + titleOffset})`)
            .style('cursor', 'pointer')
            .on('mouseover', function () {
                highlightLines(item.key);

                // bold text + stroke rect
                select(this).select('text').style('font-weight', 'bold');
                select(this).select('rect').attr('stroke', 'black').attr('stroke-width', 2);
            })
            .on('mouseout', function () {
                unhighlightLines();

                // reset text + rect
                select(this).select('text').style('font-weight', 'normal');
                select(this).select('rect').attr('stroke', 'none');
            });

        row.append('rect').attr('width', 18).attr('height', itemHeight).attr('fill', item.color)

        row.append('text').attr('x', 25).attr('y', 14).attr('class', 'em-legend-label').text(item.label)
    })
}


function highlightLines(nodeId) {
    if (!nodeId) return;

    selectAll('.em-flow-link, .em-flow-link-bundled')
        .classed('highlighted', function () {
            //const o = this.getAttribute('data-origin'); 
            const d = this.getAttribute('data-dest');
            return  d === nodeId; // destination only here
        })
        .classed('dimmed', function () {
            //const o = this.getAttribute('data-origin');
            const d = this.getAttribute('data-dest');
            return !( d === nodeId);
        });
}

function unhighlightLines() {
    selectAll('.em-flow-link, .em-flow-link-bundled')
        .classed('highlighted', false)
        .classed('dimmed', false);
}