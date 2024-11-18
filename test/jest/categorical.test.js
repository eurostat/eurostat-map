var assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('urban/rural categorical map with csvDataSource', async () => {
    let browser = await puppeteer.launch({
        headless: true,
        //sloMo: 80,
        args: ['--window-size=1000,1000'],
    })

    const page = await browser.newPage()

    await page.goto(`file:${path.join(__dirname, 'test.html')}`)

    // evaluate will run the function in the page context
    await page.evaluate((_) => {
        // these will be executed within test.html, that was loaded before.
        //builds map in test.html
        eurostatmap
            .map('categorical')
            .svgId('testMap')
            .title('NUTS urban/rural typology')
            .scale('60M')
            .nutsYear(2013)
            .nutsLevel(3)
            .stat({
                csvURL: 'https://eurostat.github.io/eurostat-map/examples/urb_rur_typo.csv',
                geoCol: 'NUTS_ID_2013',
                valueCol: 'urban_rural',
            })
            .classToFillStyle({ urb: '#fdb462', int: '#ffffb3', rur: '#ccebc5' })
            .classToText({ urb: 'Urban', int: 'Intermediate', rur: 'Rural' })
            .legend({
                decimals: 0,
            })
            .build()
    })

    // we're done; close the browser
    await browser.close()
})
