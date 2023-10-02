import { Page } from "puppeteer-core";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
import Adblocker from 'puppeteer-extra-plugin-adblocker'


puppeteer.use(StealthPlugin()).use(Adblocker({ blockTrackers: true })).launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false }).then(async browser => {
  //browser new page
  const page = await browser.newPage();
  // const randomUserAgent = new UserAgent();

  //set viewpoint of browser page
  await page.setViewport({ width: 1280, height: 720 });
  //launch URL

  await page.goto('https://www.fragrantica.com/search/', { timeout: 0 });

  await new Promise(r => setTimeout(r, 15000));
  //get more
  await page.waitForSelector("#offCanvasLeftOverlap1 > div > div > div:nth-child(12) > div.ais-Panel > div > p > div > button");

  await page.click("#offCanvasLeftOverlap1 > div > div > div:nth-child(12) > div.ais-Panel > div > p > div > button");

  for (var i = 3; i < 4; i++) {

    await page.click(`#offCanvasLeftOverlap1 > div > div > div:nth-child(12) > div.ais-Panel > div > p > div > ul > li:nth-child(${i})`);
    console.log("new parent")
    await new Promise(r => setTimeout(r, 6000));

    for (var j = 3; j < 4; j++) {
      await page.click(`#offCanvasLeftOverlap1 > div > div > div:nth-child(3) > div.ais-Panel-body > p > div > ul > li:nth-child(${j})`);
      console.log("gen change");
      await new Promise(r => setTimeout(r, 6000));

      // Define the CSV file and header
      const csvWriter = createCsvWriter({
        path: `dataP${i}-G${j}.csv`, // Specify the path to your CSV file
        header: [
          { id: 'name', title: 'Name' },   // Example headers, adjust as needed
          { id: 'link', title: 'Link' },
          { id: 'creator', title: 'Creator' },
        ],
        append: true, // Set append to true to append data to an existing file
      });

      //look for table
      const selector = '.cell.card.fr-news-box'; // Replace with the actual class name
      await page.waitForSelector(selector).then(async () => { console.log("found table"); });
      var elements = await page.$$(selector);

      // Loop through the elements and do something with each one
      var count = 1;
      var cont = false;
      while (true) {

        const element = elements[count - 1];
        var end = false;
        if (cont) {
          cont = true;
          break;
        }

        try {

          for (let i = 0; i < 3; i++) {
            if (i > 1) {
              end = true;
            }
            try {
              await element.waitForSelector(".card-section").then(async () => { console.log("found element in table"); });
              break;
            }
            catch (e) {

              console.log("Error", e.stack);
              console.log("Error", e.name);
              console.log("Error", e.message);
              await new Promise(r => setTimeout(r, 2000));
              if (end) {
                console.log("End triggered")
                cont = true;
                break;
              }
              await clickbtn(page);
            }
          }

          console.log(count);

          let box1 = await element.$("div:nth-child(1)");
          let box2 = await element.$("div:nth-child(2)");
          let ob: any = await box2.$eval("p:nth-child(1) > a", node => {
            return { name: node.innerText, link: node.href };
          });
          let creator: any = await box2.$eval("p:nth-child(2) > small", node => node.innerText);
          ob["creator"] = creator;
          console.log(ob);
          appendData(csvWriter, ob);



          if (count % 30 == 0) {
            console.log("looking for button");
            const butn = '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-8.large-9.cell > div > div > div > div.off-canvas-content.content1 > div.grid-x.grid-padding-x.grid-padding-y > div > div:nth-child(3) > div > div > div > div > div > button';
            await page.waitForSelector(butn);
            // Click the "more results" button
            await page.click(butn);
            console.log("button clicked")
            await new Promise(r => setTimeout(r, 2000));
            elements = await page.$$(selector);
          }

          count++;
        }
        catch (e) {

          console.log("Error", e.stack);
          console.log("Error", e.name);
          console.log("Error", e.message);
          await new Promise(r => setTimeout(r, 2000));
          if (end) {
            console.log("End triggered")
            break;
          }
          await clickbtn(page);
        }
      }

      await page.click(`#offCanvasLeftOverlap1 > div > div > div:nth-child(3) > div.ais-Panel-body > p > div > ul > li:nth-child(1)`);
    }

    await page.click(`#offCanvasLeftOverlap1 > div > div > div:nth-child(12) > div.ais-Panel > div > p > div > ul > li:nth-child(1)`);
  }
  //capture screenshot
  await page.screenshot({
    path: 'end of scan'
  });
  //browser close
  // await browser.close()
})


async function appendData(csvWriter, data) {
  try {
    await csvWriter.writeRecords([data]);
    console.log('Data appended to CSV file');

  } catch (err) {
    console.error('Error appending data to CSV file:', err);
  }
}

async function clickbtn(page) {
  console.log("looking for button");
  const butn = '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-8.large-9.cell > div > div > div > div.off-canvas-content.content1 > div.grid-x.grid-padding-x.grid-padding-y > div > div:nth-child(3) > div > div > div > div > div > button';
  await page.waitForSelector(butn);
  // Click the "more results" button
  await page.click(butn);
  console.log("button clicked")
  await new Promise(r => setTimeout(r, 2000));

}

