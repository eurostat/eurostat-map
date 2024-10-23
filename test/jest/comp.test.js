var assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('Composition stripes', async () => {
    let browser = await puppeteer.launch({
        headless: true,
        //sloMo: 80,
        args: ['--window-size=1000,1000'],
    })

    const page = await browser.newPage()

    await page.goto(`file:${path.join(__dirname, 'test.html')}`)

    // evaluate will run the function in the page context
    await page.evaluate((_) => {
        eurostatmap
            .map('scomp')
            .svgId('testMap1')
            .scale('60M')
            .nutsLevel(1)
            .nutsYear(2016)
            .stripeWidth(12)
            .stripeOrientation(-10)
            .statComp(
                { eurostatDatasetCode: 'agr_r_animal', filters: { unit: 'THS_HD', time: '2018' }, unitText: '1000 heads' },
                'animals',
                ['A2000', 'A2300', 'A2400', 'A3100', 'A4100', 'A4200'],
                ['bovines', 'cows', 'buffalos', 'pigs', 'sheeps', 'goats'],
                ['#7fc97f', '#beaed4', '#fdc086', '#ffff99', '#386cb0', '#f0027f']
            )
            .legend({ x: 10, y: 150, title: 'Animal' })

        eurostatmap
            .map('scomp')
            .svgId('testMap1')
            .scale('60M')
            .nutsLevel(3)
            .nutsYear(2016)
            .stripeWidth(10)
            .stripeOrientation(20)
            .stat('Y_LT15', {
                eurostatDatasetCode: 'demo_r_pjanaggr3',
                filters: { age: 'Y_LT15', sex: 'T', unit: 'NR', time: '2019' },
                unitText: 'inhabitants',
            })
            .stat('Y15-64', {
                eurostatDatasetCode: 'demo_r_pjanaggr3',
                filters: { age: 'Y15-64', sex: 'T', unit: 'NR', time: '2019' },
                unitText: 'inhabitants',
            })
            .stat('Y_GE65', {
                eurostatDatasetCode: 'demo_r_pjanaggr3',
                filters: { age: 'Y_GE65', sex: 'T', unit: 'NR', time: '2019' },
                unitText: 'inhabitants',
            })
            .catColors({ Y_LT15: '#33a02c', 'Y15-64': '#cab2d6', Y_GE65: '#ff7f00' })
            .pieChartRadius(20)
            .pieChartInnerRadius(5)
            .legend({ x: 500, y: 10, title: 'Population by age' })
    })

    await browser.close()
})
