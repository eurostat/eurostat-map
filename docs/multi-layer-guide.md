# Multi-Layer Stack Guide & Migration

This guide introduces the **Multi-Layer Stack API** in `eurostat-map`. This feature allows stacking multiple thematic layers (such as a choropleth base layer and a proportional symbol overlay layer) on a single map, sharing geometry, projection, and datasets while maintaining isolated rendering groups, tooltips, and legends.

---

## 1. Core Architecture: Map vs. Layer

In the legacy API, a map was created with a single type:
```javascript
eurostatmap.map('choropleth')...
```
This fused the map frame (dimensions, zoom, projections, dataset registry) with the thematic visualization (class breaks, coloring, styling, legends).

The new architecture splits these concerns:
- **Map (Frame & Orchestration):** Owns geometry, projection, SVG element, shared dataset cache (`statData_`), build lifecycle, and frame decorations.
- **Layer (Thematic Unit):** Owns a specific visualization `type` (e.g., `choropleth`, `proportionalSymbol`), local visual `encoding` configurations, classification, and styling state. Renders to its own isolated DOM group.

---

## 2. Multi-Layer Declaration API

To create a stacked map, call `eurostatmap.map()` with **no type argument**, then define shared datasets and declare the stack of layers using `.layers([...])` or `.addLayer(...)`:

```javascript
const map = eurostatmap
    .map() // returns a map frame with an empty layers stack
    .width(800)
    .nutsYear(2021)
    .nutsLevel(0)
    .title('Population and density')

    // Define shared datasets (fetched/cached once at the map level)
    .stat('density', { eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²' })
    .stat('population', { eurostatDatasetCode: 'demo_r_pop', unitText: 'people' })

    // Declare the layers stack (rendered from bottom to top)
    .layers([
        {
            type: 'choropleth',
            encoding: { fill: { stat: 'density' } },
            classificationMethod: 'quantile',
            numberOfClasses: 7
        },
        {
            type: 'proportionalSymbol',
            encoding: { size: { stat: 'population' } },
            psSettings: {
                maxSize: 30,
                minSize: 3,
                fill: '#ff7800',
                fillOpacity: 0.6
            }
        }
    ])
    .build();
```

### Chaining with `addLayer`
Alternatively, you can add layers imperatively. `addLayer` returns the **layer** instance, which lets you configure it via chaining:

```javascript
const map = eurostatmap.map().width(800);

// Add choropleth base
const base = map.addLayer('choropleth')
    .encoding('fill', { stat: 'density' })
    .classificationMethod('quantile')
    .numberOfClasses(5);

// Add proportional symbols overlay
const overlay = map.addLayer('proportionalSymbol')
    .encoding('size', { stat: 'population' })
    .legend({
        sizeLegend: { title: 'Population' }
    });

map.build();
```

---

## 3. Layer Roles: Base vs. Overlay

To prevent visual conflicts, layers have distinct roles:
1. **Base Layers (`base`):** Color region backgrounds. A map can have **at most one** base layer (e.g. `choropleth`, `categorical`, etc.).
2. **Overlay Layers (`overlay`):** Render shapes or vector symbols (e.g., `proportionalSymbol`, `pieChart`) at centroids.

### Correctness and DOM Isolation
- **Background Protection:** Overlays stacked on top of a base layer are gated so they **never** alter the region background fills of the base layer.
- **DOM Ordering:** Overlays are automatically sorted and rendered in distinct SVG `<g>` groups above the base layer, ensuring symbols stay visible and clickable.
- **Legends:** When multiple layers have active legends in the same corner, they stack vertically without overlapping.

---

## 4. Backwards Compatibility & Legacy Sugar

All legacy single-type constructors and setters remain fully supported:
- `eurostatmap.map('choropleth')` still instantiates a single-type choropleth map.
- Methods called directly on the map (e.g., `map.colors()`, `map.classes()`, `map.legend()`) are transparently forwarded to **Layer 0** (the active base layer).
