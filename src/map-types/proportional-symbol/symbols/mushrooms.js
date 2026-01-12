import { arc } from "d3-shape";
import { select } from "d3-selection";

export function appendMushroomsToMap(map, sizeData, sizeData2) {
    const g = map.svg().selectAll("g.em-centroid");

    const arcGen = arc()
        .innerRadius(0);

    const symbols = g
        .filter(d => {
            const v1 = sizeData.get(d.properties.id)?.value;
            const v2 = sizeData2?.get(d.properties.id)?.value;
            return (v1 && v1 !== ":") || (v2 && v2 !== ":");
        })
        .append("g")
        .attr("class", "em-ps-mushroom");

    // --- TOP (incoming) ---
    symbols.append("path")
        .attr("class", "em-ps-mushroom-in")
        .attr("d", d => {
            const v = sizeData2?.get(d.properties.id)?.value;
            if (!v || v === ":") return null;
            const r = map.classifierSize_(+v);
            return arcGen
                .outerRadius(r)
                .startAngle(-Math.PI)
                .endAngle(0)();
        });

    // --- BOTTOM (outgoing) ---
    symbols.append("path")
        .attr("class", "em-ps-mushroom-out")
        .attr("d", d => {
            const v = sizeData.get(d.properties.id)?.value;
            if (!v || v === ":") return null;
            const r = map.classifierSize_(+v);
            return arcGen
                .outerRadius(r)
                .startAngle(0)
                .endAngle(Math.PI)();
        });

    return symbols;
}
