var assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('exporting map as SVG', async () => {
    let browser = await puppeteer.launch({
        headless: true,
        //sloMo: 80,
        //args: ["--window-size=1000,1000"]
    })

    const page = await browser.newPage()

    await page.goto(`file:${path.join(__dirname, 'test.html')}`)

    // evaluate will run the function in the page context
    await page.evaluate((_) => {
        let myMap = eurostatmap
            .map('ch')
            .title('Population in Europe')
            .width(600)
            .scale('20M')
            .stat({ default: { eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²' } })
            .classificationMethod('threshold')
            .threshold([50, 75, 100, 150, 300, 850])
            .tooltipShowFlags(false)
            .legend({
                title: 'Population change from 2015 to 2016 : in ‰)',
                decimals: 0,
            })
            .callback(function () {
                setTimeout(() => {
                    myMap.exportMapToPNG()
                    myMap.exportMapToSVG()
                }, 200)
            })
            .build()
    })

    // we're done; close the browser
    await browser.close()
})
