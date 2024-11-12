var assert = require('assert');
const puppeteer = require("puppeteer");
const path = require("path")



// opens test.html using headless chrome
// to run tests in open browser, set headless to false.
test('choropleth with fill pattern', async () => {
    let browser = await puppeteer.launch({
        headless: true,
        //sloMo: 80,
        args: ["--window-size=1000,1000"]
    })

    const page = await browser.newPage();

    await page.goto(`file:${path.join(__dirname, 'test.html')}`)

    // evaluate will run the function in the page context
    await page.evaluate(_ => {
        // these will be executed within test.html, that was loaded before
        //builds test map in test.html
        eurostatmap.map("ch")
            .width(900)
            .title("Population in Europe")
            .titleFontSize(40)
            .titleFill("#444")
            .scale("60M")
            .classifMethod("threshold").threshold([35, 50, 80, 100, 140, 180, 300, 500, 1300])

            .filtersDefinitionFun(eurostatmap.getFillPatternDefinitionFun({ patternSize: 5, shape: "circle", bckColor: "white", symbColor: "black" }))

            .nutsbnStroke({ 0: "#777", 1: "#777", 2: "#777", 3: "#777", oth: "#444", co: "#777" })
            .nutsbnStrokeWidth({ 0: 1, 1: 0.2, 2: 0.2, 3: 0.2, oth: 1, co: 1 })
            .nutsrgSelFillSty("darkblue")

            .cntrgFillStyle("white")
            .cntbnStroke({ def: "#777", co: "white" })

            .seaFillStyle("#e9e9e9")
            .coastalMarginColor("#777")
            .coastalMarginStdDev(10)
            .coastalMarginWidth(5)

            .graticuleStroke("#888")

            .build();
    });

    // we're done; close the browser
    await browser.close();

})