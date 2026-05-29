;(function (root, factory) {
    const manifest = factory()

    if (typeof module === 'object' && module.exports) {
        module.exports = manifest
    }

    root.eurostatMapExamples = manifest
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
    const paths = [
        'bar-chart/bar-chart.html',
        'bivariate/pop-unemploy-bivariate.html',
        'cartogram/dorling.html',
        'cartogram/grid/bivariate-choropleth.html',
        'cartogram/grid/choropleth.html',
        'cartogram/grid/coxcomb.html',
        'cartogram/grid/grid-cartogram.html',
        'cartogram/grid/pie.html',
        'cartogram/grid/sparklines.html',
        'cartogram/grid/stripe.html',
        'cartogram/grid/waffle.html',
        'cartogram/trade-asymmetry/index.html',
        'categorical/categorical.html',
        'CCM/index.html',
        'choropleth/annotations.html',
        'choropleth/basic.html',
        'choropleth/EU_only.html',
        'choropleth/gdp-per-inhabitant.html',
        'choropleth/labelling.html',
        'choropleth/linked_maps.html',
        'choropleth/population-change.html',
        'choropleth/population-density.html',
        'choropleth/small_multiple.html',
        'choropleth/spain.html',
        'choropleth/world.html',
        'coxcomb/coxcomb.html',
        'dot-density/population-dot-density.html',
        'flow/flights/flights.html',
        'flow/flowmap.html',
        'misc/annotations.html',
        'misc/custom-geometries.html',
        'misc/custom-stats.html',
        'misc/export.html',
        'misc/hatching.html',
        'misc/locations.html',
        'misc/minimap.html',
        'misc/placenames.html',
        'misc/projection.html',
        'misc/scalebar.html',
        'misc/stamp.html',
        'misc/story-map/index.html',
        'mushroom/mushroom.html',
        'pie-charts/prop-piecharts.html',
        'proportional-symbols/population-change.html',
        'proportional-symbols/population-total.html',
        'proportional-symbols/prop-circles.html',
        'proportional-symbols/prop-symbols.html',
        'RYB/2026/CH02/CH02M03.html',
        'RYB/2026/CH03/CH03M02.html',
        'RYB/2026/CH10/CH10M02.html',
        'RYB/2026/CH10/CH10M06.html',
        'RYB/2026/CH11/CH11M04.html',
        'RYB/2026/CH11/CH11M05.html',
        'sparklines/sparklines-grid-cartogram.html',
        'sparklines/sparklines.html',
        'statistics-explained/business/construction/choropleth/index.html',
        'statistics-explained/business/construction/proportional-circle/index.html',
        'statistics-explained/business/manufacturing/choropleth/index.html',
        'statistics-explained/business/manufacturing/proportional-circle/index.html',
        'statistics-explained/business/NACE/choropleth/index.html',
        'statistics-explained/business/NACE/proportional-circle/index.html',
        'statistics-explained/transport/air/airports/index.html',
        'statistics-explained/transport/air/freight/index.html',
        'statistics-explained/transport/air/passengers/index.html',
        'statistics-explained/transport/maritime/flows/index.html',
        'statistics-explained/transport/maritime/flows/static/index.html',
        'statistics-explained/transport/maritime/ports/index.html',
        'statistics-explained/transport/maritime/ports/static/index.html',
        'stripe/farm_size.html',
        'stripe/livestock_composition.html',
        'trivariate/trivariate.html',
        'ur/crude_rate_natural_change.html',
        'ur/gdp_change.html',
        'ur/land_cover_stripes.html',
        'ur/migration.html',
        'ur/old_dependency.html',
        'ur/pop_change.html',
        'ur/proj_pop_change.html',
        'waffle/waffle.html',
    ]

    const previewPathFor = (examplePath) => './img/previews/' + examplePath.replace(/\.html$/, '.png')

    const legacyPreviewPathFor = (examplePath) => {
        const basename = examplePath.split('/').pop() || ''
        return './img/previews/' + basename.replace(/\.html$/, '.png')
    }

    const isShowcasePath = (examplePath) =>
        !examplePath.startsWith('statistics-explained/') &&
        !examplePath.startsWith('RYB/') &&
        !examplePath.startsWith('ur/') &&
        !examplePath.startsWith('CCM/')

    const typeForPath = (examplePath) => {
        if (examplePath.startsWith('bar-chart/')) return 'Bar Chart'
        if (examplePath.startsWith('bivariate/')) return 'Bivariate'
        if (examplePath.startsWith('cartogram/')) return 'Cartogram'
        if (examplePath.startsWith('cartograms/')) return 'Cartogram'
        if (examplePath.startsWith('categorical/')) return 'Categorical'
        if (examplePath.startsWith('CCM/')) return 'Country Comparison'
        if (examplePath.startsWith('choropleth/')) return 'Choropleth'
        if (examplePath.startsWith('coxcomb/')) return 'Coxcomb'
        if (examplePath.startsWith('dot-density/')) return 'Dot Density'
        if (examplePath.startsWith('flow/')) return 'Flow Map'
        if (examplePath.startsWith('miscellaneous/')) return 'Miscellaneous'
        if (examplePath.startsWith('mushroom/')) return 'Mushroom'
        if (examplePath.startsWith('pie-charts/')) return 'Pie Charts'
        if (examplePath.startsWith('proportional/')) return 'Proportional'
        if (examplePath.startsWith('RYB/')) return 'RYB'
        if (examplePath.startsWith('sparklines/')) return 'Sparklines'
        if (examplePath.startsWith('statistics-explained/')) return 'Statistics Explained'
        if (examplePath.startsWith('stripe/')) return 'Stripe'
        if (examplePath.startsWith('trivariate/')) return 'Trivariate'
        if (examplePath.startsWith('ur/')) return 'Urban-Rural'
        if (examplePath.startsWith('waffle/')) return 'Waffle'
        return 'Other'
    }

    return {
        paths,
        previewPathFor,
        legacyPreviewPathFor,
        isShowcasePath,
        typeForPath,
    }
})
