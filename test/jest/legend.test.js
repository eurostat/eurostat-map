var assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('separated legend', async () => {
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
        eurostatmap
            .map('choropleth')
            .width(500)
            .scale('60M')
            .stat({ eurostatDatasetCode: 'demo_r_d3dens', unitText: 'people/km²' })
            .classificationMethod('threshold')
            .threshold([50, 75, 100, 150, 300, 850])
            .tooltipShowFlags(false)
            .legend({
                title: 'Population density (people/km²)',
                decimals: 0,
            })
            .build()
    })

    // we're done; close the browser
    await browser.close()
})
