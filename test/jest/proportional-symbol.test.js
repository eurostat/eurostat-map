var assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('proportional symbol map', async () => {
    let browser = await puppeteer.launch({
        headless: true,
        //sloMo: 80,
        args: ['--window-size=1000,1000'],
    })

    const page = await browser.newPage()

    await page.goto(`file:${path.join(__dirname, 'test.html')}`)

    // evaluate will run the function in the page context
    await page.evaluate((_) => {
        // these will be executed within test.html, that was loaded before
        //builds test map in test.html
        // custom path
        let euroPath =
            'm 224.99996,16.22698 -8.11342,36.41161 q -24.14255,-19.78892 -54.61741,-19.78892 -41.3588,0 -65.00658,23.74671 -23.647774,23.7467 -28.397115,53.23215 l 134.960355,0 -5.14505,26.71508 -132.981532,0 -0.395848,7.71771 0.395848,18.20566 127.242642,0 -5.14505,26.71508 -117.941954,0 q 7.519719,40.17154 32.552754,59.06997 25.03303,18.89844 56.49745,18.89844 37.20302,0 57.98149,-19.59107 l 0,40.9631 Q 192.34828,300 162.26913,300 53.034301,300 30.474864,189.18206 l -30.474864,0 5.738751,-26.71508 20.580475,0 q -0.395708,-4.74934 -0.395708,-17.80995 l 0,-8.11342 -25.923518,0 5.738751,-26.71508 23.152999,0 Q 39.181988,55.21112 76.583149,27.60556 113.98417,0 163.06069,0 199.868,0 224.99996,16.22698 z'

        eurostatmap
            .map('ps')
            .svgId('ps-test-map')
            .nutsLvl(0)
            .title('GDP, 2018')
            .nutsrgSelFillSty('cyan')
            .zoomExtent([1, 2])
            //GDP per inhabitant
            .stat('color', {
                eurostatDatasetCode: 'nama_10r_3gdp',
                unitText: 'EUR/inhabitant',
                filters: { unit: 'EUR_HAB', time: '2018' },
            })
            // total GDP
            .stat('size', {
                eurostatDatasetCode: 'nama_10r_3gdp',
                unitText: 'Million EUR',
                filters: { unit: 'MIO_EUR', time: '2018' },
            })

            //prop symbols configuration
            .psCustomSVG(euroPath) // cross, diamond, star, square, wye, circle, triangle, rectangle https://github.com/d3/d3-shape#symbols
            .psMaxSize(0.26)
            .psMinSize(0.05) //minSize for customPaths indicates scale() value, not pixel size
            .psFillOpacity(1)
            .psOffset({ x: -150, y: -150 })
            .psStroke('black')
            .psStrokeWidth(10)

            .psClassifMethod('threshold')
            .psThreshold([10000, 20000, 30200, 40000, 50000])
            .psColors(['#2d50a0', '#6487c3', '#aab9e1', '#f0cd91', '#e6a532', '#d76e2d'].reverse())

            //legend config
            .legend({
                x: 580,
                ascending: false,
                boxPadding: 15,
                sizeLegend: {
                    title: 'Total GDP (million EUR)',
                    cellNb: 3,
                    shapePadding: 90,
                    titlePadding: -60,
                    shapeOffset: { x: 0, y: -30 },
                    labelOffset: 70,
                },
                colorLegend: {
                    title: 'GDP per inhabitant (EUR)',
                },
                legendSpacing: 0,
            })
            //.labelling(true)
            .build()
    })

    // we're done; close the browser
    await browser.close()
})
