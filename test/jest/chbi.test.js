var assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('Bivariate choropleth map', async () => {
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
            .map('chbi')
            .nutsLevel(2)
            .nutsYear(2016)
            .stat('v1', { eurostatDatasetCode: 'demo_r_d3dens', unitText: 'inh./km²' })
            .stat('v2', {
                eurostatDatasetCode: 'lfst_r_lfu3rt',
                filters: { age: 'Y20-64', sex: 'T', unit: 'PC', time: 2017 },
                unitText: '%',
            })
            .numberOfClasses(4)
            .startColor('lightgray')
            .color1('red')
            .color2('green')
            .endColor('black')
            .legend({ boxFill: 'none', squareSize: 80, label1: 'Unemployment', label2: 'Population', x: 10, y: 140 })
            .build()
    })

    // we're done; close the browser
    await browser.close()
})
