var assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('geo focus on spain with custom inset on canary islands', async () => {
    let browser = await puppeteer.launch({
        headless: true,
        //sloMo: 80,
        args: ['--window-size=1000,1000'],
    })

    const page = await browser.newPage()

    await page.goto(`file:${path.join(__dirname, 'test.html')}`)

    // evaluate will run the function in the page context
    await page.evaluate((_) => {
        const map = eurostatmap
            .map('ch', {
                title: 'Unemployment in Spain',
                width: 550,
                heiht: 550,
                nutsLevel: 2,
                stat: {
                    eurostatDatasetCode: 'lfst_r_lfu3rt',
                    filters: { age: 'Y20-64', sex: 'T', unit: 'PC', time: '2019' },
                    unitText: '%',
                },
                titleFill: '#333',
                titlePosition: [20, 37],
                scale: '10M',
                geoCenter: [3220000, 1970000],
                pixelSize: 2900,
                //classificationMethod: "equinter", numberOfClasses: 15,
                classificationMethod: 'threshold',
                threshold: [4, 6, 8, 10, 12, 14, 16, 18, 20, 21],
                //colorFun: d3.interpolateBlues,
                nutsbnStroke: { 0: '#555', 1: '#777', 2: '#777', 3: '#777', oth: '#444', co: '#1f78b4' },
                nutsbnStrokeWidth: { 0: 2.5, 1: 1.5, 2: 1.5, 3: 0.2, oth: 1, co: 1 },
                seaFillStyle: 'white',
                coastalMarginColor: '#bbb',
                drawGraticule: false,
                insets: [
                    {
                        geo: 'IC',
                        pixelSize: 2900,
                        width: 200,
                        height: 90,
                        title: 'Canary islands',
                        titleFontSize: 16,
                        titleFontWeight: '',
                    },
                ],
                insetBoxPosition: [335, 345],
                legend: { decimals: 1, x: 13, y: 60, boxOpacity: 0, boxPadding: 7, title: 'Rate (%)', noData: false },
                callback: function () {
                    //set title with date
                    map.title(map.title() + ' in ' + map.getTime())
                },
            })
            .build()
    })

    // we're done; close the browser
    await browser.close()
})
