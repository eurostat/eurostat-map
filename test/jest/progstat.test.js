var assert = require('assert')
const puppeteer = require('puppeteer')
const path = require('path')

// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('programmatically defined statistics', async () => {
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
        const map = eurostatmap.map('ch')
        map.nutsLevel(0)

        map.statData()
            .set('LU', 500)
            .set('DE', 400)
            .set('FR', 100)
            .set('IT', 600)
            .setData({
                FR: 10,
                DE: { value: 7, status: 'e' },
                UK: 12,
            })
            .set('IT', 200)
            .set('UK', { value: 50, status: 'p' })

        map.build()
    })

    // we're done; close the browser
    await browser.close()
})
