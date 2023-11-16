import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import Adblocker from 'puppeteer-extra-plugin-adblocker';
import * as fs from 'fs';
import csvParser from 'csv-parser';
import { Page, TimeoutError } from "puppeteer-core";
import mongoose from 'mongoose';
import 'dotenv/config';
import { Perfume } from './dbSchema';



const MAX_TRY = 3;
const parametersArray = Array(9).fill(null).map((_, index) => index + 1);
const allProxies: string[] = readTextFileByLine('valid_proxies.txt');

const proxyLists = new Map<number, string[]>();

for (let i = 1; i <= 10; i++) {
    const key = i;
    const startIndex = (i - 1) * 2;
    const endIndex = startIndex + 2;
    const proxies = allProxies.slice(startIndex, endIndex);

    proxyLists.set(key, proxies);


}
console.log(proxyLists);


// startScript(1, "p");

// const proxies = ["34.171.218.6:80", "34.129.214.240", "34.143.247.3"]
const promises = parametersArray.map(param => () => startScript(param, proxyLists.get(param), param));

(async () => {
    await connectDB();
    const results = await Promise.all(promises.map(fn => fn()));
    console.log('All scripts have completed.');
})();


function readTextFileByLine(filePath: string): string[] {
    try {
        const data: string = fs.readFileSync(filePath, 'utf-8');
        const lines: string[] = data.split('\n');
        return lines;
    } catch (error) {
        console.error('Error reading the file:', error);
        return [];
    }
}

async function randomWait() {

    const time = Math.random() * (7 - 2) + 2;
    await new Promise(r => setTimeout(r, time * 1000));
}


async function connectDB() {
    // Connect to MongoDB
    mongoose.connect(process.env["DB_STRING"]);

    const db = mongoose.connection;

    db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    db.once('open', () => {
        console.log('Connected to MongoDB');
    });

    return db;
}

async function switchProxy(currentProxyIndex) {
    currentProxyIndex = (currentProxyIndex + 1) % 2;
    return currentProxyIndex;
}

async function startScript(start: number, listProxy: string[], indentifier) {

    let currentProxyIndex = 0;
    let rowCount = 1;
    let fileCount = 1;
    let end = false;


    while (!end) {
        let blocked = false;
        currentProxyIndex = await switchProxy(currentProxyIndex);

        console.log("currentProxy: " + listProxy[currentProxyIndex].trim())
        await puppeteer.use(StealthPlugin()).use(Adblocker({ blockTrackers: true })).launch(
            {
                executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false,
                args: [`--proxy-server=${listProxy[currentProxyIndex].trim()}:80`]
                // args: [`--proxy-server=34.171.218.6:80`]
            }).then(async browser => {
                for (let j = fileCount; j < 4; j++) {
                    const rows = await readfromcsv(`dataP${start}-G${j}.csv`);

                    let page = await browser.newPage();

                    await page.authenticate({ username: "linja", password: "Ob$di@nL2Cheng" });
                    // await page.setUserAgent("Mozilla/5.0 (Windows; U; Windows NT 10.3; x64; en-US) AppleWebKit/535.44 (KHTML, like Gecko) Chrome/47.0.1142.139 Safari/534");

                    for (let k = rowCount; k < rows.length; k++) {
                        console.log(rows[k]);
                        console.log(k);

                        if (await findInDB(rows[k].Name, rows[k].Brand) === null) {
                            console.log("reading!!")
                            await new Promise(r => setTimeout(r, 5000));

                            await page.goto(rows[k].Link, { timeout: 0 });
                            // await page.goto("https://whatismyipaddress.com/", { timeout: 0 });
                            blocked = await checkForTooManyRequests(page);
                            if (blocked) {
                                console.log(blocked);
                                rowCount = k;
                                break;
                            }

                            await new Promise(r => setTimeout(r, 5000));

                            await readFromPage(page, rows[k]);
                        } else {
                            console.log("skipping!! " + rows[k].Name);
                        }

                        // await new Promise(r => setTimeout(r, 2000));



                    }

                    if (blocked) {
                        fileCount = j;
                        await browser.close();
                        break;
                    }


                }

                if (!blocked) {
                    console.log("Finished all 3 files script: " + indentifier);
                    const contentToWrite = `P${start}`;

                    fs.writeFile('output.txt', contentToWrite, (err) => {
                        if (err) {
                            console.error('Error writing to file:', err);
                        } else {
                            console.log('File has been written successfully.');
                        }
                    });

                    end = true;
                    browser.close();
                }



            });
        // } catch (error) {
        //     console.log(error);
        //     console.log("proxy failed: " + indentifier);
        // }
    }
}
async function checkForTooManyRequests(page): Promise<boolean> {
    try {
        const hasTooManyRequests = await page.evaluate(() => {
            const tooManyRequestsText = "Remember, if you attempt to scrape our website, we'll have no choice but to call";
            return document.body.innerText.includes(tooManyRequestsText);
        });

        return hasTooManyRequests;
    } catch (error) {
        console.error('Error checking for "Too many requests":', error);
        return false;
        // } finally {
        //     await browser.close();
        // }
    }
}

async function getImageUrl(page, selector: string) {
    try {
        const imgSrc = await page.$eval(selector, (img) => img.src);

        return imgSrc;
    } catch (error) {

        return null;
    }

}
async function readFromPage(page, details) {
    var tryCount = 0;
    var tryCount2 = 0;
    await randomWait();
    var gender;
    while (tryCount2 < MAX_TRY) {
        try {
            await page.waitForSelector('#toptop > h1', { timeout: 5000 });
            gender = await page.$eval('#toptop > h1 > small', node => node.innerText);

            break;
        } catch {
            await page.screenshot({ path: 'screenshot.jpg' });
            console.log(" cant find top title");
            tryCount2++;
        }
    }

    const image = await getImageUrl(page, '.cell.small-6.text-center > .grid-x > .cell.small-12 > img');

    var genderNum;

    if (gender === "for women and men") {
        genderNum = 2;
    }
    else if (gender === "for men") {
        genderNum = 1;
    }
    else {
        genderNum = 0;
    }

    const accordBars = await page.$$eval('.accord-box .accord-bar', (elements) => {
        return elements.map((element) => {
            const style = window.getComputedStyle(element);
            const width = parseFloat(style.getPropertyValue('width'));
            return {
                Type: element.textContent,
                Strength: parseFloat((width / 296.797 * 100).toFixed(2)),
            };
        });
    });

    console.log(accordBars);


    const TopNotesExtract = await readToArray('top', page, '#pyramid > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(4) > div > div:nth-child(1)', '#pyramid > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(4) > div > div');
    const MiddleNoteExtract = await readToArray('middle', page, '#pyramid > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > div > div:nth-child(1) > div:nth-child(2)', '#pyramid > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(6) > div > div');
    const BaseNotesExtract = await readToArray('base', page, '#pyramid > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(8) > div > div:nth-child(1)', '#pyramid > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(8) > div > div');
    await randomWait();

    let pros = await readToArray("pros", page, '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(5) > div > div:nth-child(1) > div:nth-child(2)', '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(5) > div > div:nth-child(1) > div > span');
    let cons = await readToArray("cons", page, '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(5) > div > div:nth-child(2) > div:nth-child(2)', '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(5) > div > div:nth-child(2) > div > span');
    if (pros == null && cons == null) {
        console.log("finding new pros and cons")
        pros = await readToArray("pros", page, '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(4) > div > div:nth-child(1) > div:nth-child(2)', '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(4) > div > div:nth-child(1) > div > span');
        cons = await readToArray("cons", page, '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(4) > div > div:nth-child(2) > div:nth-child(2)', '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(4) > div > div:nth-child(2) > div > span');

    }
    await randomWait();
    const summaryHTML = "#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(2) > div:nth-child(5) > div > p:nth-child(1)";
    const summary = await readParagraph("summary", page, summaryHTML, summaryHTML);
    await randomWait();
    const detailHTML = "div.fragrantica-blockquote";
    const dets = await readParagraph("details", page, detailHTML, detailHTML);

    const reviewHTML = ".cell.fragrance-review-box";
    const positiveSelector = "#popular-positive-reviews";
    const negativeSelector = "#popular-negative-reviews";
    const innerSelector = 'div > div > div.flex-child-auto > div > p';
    const scrollTo = "#main-content > div.callout.text-center"

    await randomWait();
    while (tryCount < 5) {
        try {
            await page.$('#popular-positive-reviews-label').then(async node => await node.scrollIntoView());
            await new Promise(r => setTimeout(r, 2000));
            await page.click('#popular-positive-reviews-label');

            await page.$(scrollTo).then(async node => await node.scrollIntoView());
            await new Promise(r => setTimeout(r, 5000));

            const positiveReviews = await ReadReviews("positive", page, positiveSelector, reviewHTML, innerSelector);

            await page.$('#popular-negative-reviews-label').then(async node => await node.scrollIntoView());

            await new Promise(r => setTimeout(r, 2000));
            await page.click('#popular-negative-reviews-label');

            await page.$(scrollTo).then(async node => await node.scrollIntoView());


            await randomWait();
            await new Promise(r => setTimeout(r, 5000));

            const negativeReviews = await ReadReviews("negative", page, negativeSelector, reviewHTML, innerSelector);

            await addToDB(details.Name, details.Brand, genderNum, accordBars, TopNotesExtract, MiddleNoteExtract, BaseNotesExtract, pros, cons, summary, dets, negativeReviews, positiveReviews, image);

            await new Promise(r => setTimeout(r, 10000));

            let dateTime = new Date()

            console.log(dateTime);
            break;
        }
        catch (err) {
            console.log(err);
            tryCount++;
        }
    }
}

//added try catch , need to remake this to ensure it reads reviews
async function ReadReviews(indent: string, page: Page, selectorWait: string, selector: string, innerSelector: string) {
    await new Promise(r => setTimeout(r, 2000));

    var tryCount = 0;
    while (tryCount < MAX_TRY) {

        try {
            var cat = [];
            await page.waitForSelector(selectorWait, { timeout: 5000 })
                .then(() => console.log("found: ", indent));

            const outerDiv = await page.$(selectorWait);
            const divList = await outerDiv.$$(selector);
            await new Promise(r => setTimeout(r, 2000));

            for (let i = 0; i < divList.length; i++) {
                await divList[i].scrollIntoView();
                await new Promise(r => setTimeout(r, 2000));
                const text = await divList[i].$eval(innerSelector, node => node.textContent);
                cat.push(text);
                await new Promise(r => setTimeout(r, 2000));
                if (i == 14) {
                    break;
                }
                console.log("found: ", i);
            }

            return cat;
        } catch (e) {
            console.log("error: ", e);
            tryCount++;
        }
    }

    return null;

}
async function findInDB(name, brand) {
    const found = await Perfume.findOne({ NAME: name, BRAND: brand })
    if (found === null) {
        console.log("not found in DB: ", found);
    }
    return found;
    // console.log("found: ", found);
}
async function addToDB(name: string, brand: string, gender: number, accords, top, middle, base, pros, cons, summary, desc, neg, pos, image) {
    const filter = { NAME: name, BRAND: brand };
    console.log(filter);
    const newPerfume = new Perfume({
        NAME: name,
        BRAND: brand,
        // LAUNCHDATE: number;
        // LONGEVITY: Record<string, number>;
        // SILLAGE: Record<string, number>;
        // "Price/Value": Record<string, number>;
        IMAGE: image,
        GENDER: gender,
        ACCORDS: accords,
        TOP_NOTES: top,
        MIDDLE_NOTES: middle,
        BASE_NOTES: base,
        PROS: pros,
        CONS: cons,
        SUMMARY: summary,
        DESC: desc,
        POPULAR_REVIEWS: pos,
        NEGATIVE_REVIEWS: neg,
    });

    try {
        // const saved = Perfume.findOneAndUpdate(filter, newPerfume, { new: true, upsert: true });
        const saved = await newPerfume.save();
        // console.log(saved);
        console.log("SAVED");
    } catch (e) {
        console.log("error, fail to save perfume")
    }
}

//added try catch
async function readToArray(ident: string, page, selectorwait: string, selector: string) {
    var tryCount = 0;
    while (tryCount < MAX_TRY) {
        try {
            await page.waitForSelector(selectorwait, { timeout: 5000 }).then(() => console.log("found:", ident));

            const NoteDivs = await page.$$(selector);
            var middleNotes = []
            // Extract and print the fruit names
            console.log(NoteDivs.length);
            for (const fruitDiv of NoteDivs) {
                const fruitName = await fruitDiv.evaluate(node => node.textContent.trim());
                middleNotes.push(fruitName);
            }
            await new Promise(r => setTimeout(r, 2000));

            console.log(middleNotes);

            return middleNotes;
        } catch (e) {
            console.log("message: ", e);

            console.log(page.url())
            tryCount++;
        }
    }

    return null;

}

async function readfromcsv(file) {

    // Specify the path to your CSV file
    const csvFilePath = file;

    // Create a readable stream from the CSV file
    const readStream = fs.createReadStream(csvFilePath);

    return new Promise<any[]>((resolve, reject) => {
        var rows: string[] = [];

        // Use the csv-parser library to parse the CSV data
        readStream
            .pipe(csvParser())
            .on('data', (row) => {
                // Each 'row' represents a row in the CSV file as an object
                // You can access the data in each row using object properties
                // console.log(row.Link);
                rows.push(row);
            })
            .on('end', () => {
                // The 'end' event is triggered when the entire CSV file has been processed
                console.log('CSV file processing completed.');
                resolve(rows);
            })
            .on('error', (err) => {
                // Handle any errors that occur during processing
                console.error('Error:', err);
                reject(err);
            });
    });
}

//added try catch
async function readParagraph(identifier: string, page, selector, selectorwait) {
    var tryCount = 0;
    var pDiv;
    while (tryCount < MAX_TRY) {
        try {
            await page.waitForSelector(selectorwait, { timeout: 5000 }).then(() => console.log('Paragraph found', identifier));
            pDiv = await page.$eval(selector, node => node.textContent);
            return pDiv;
        }
        catch (e) {
            console.log('error', e);
            console.log('Paragraph not found', identifier);
            tryCount++;
        }
    }
    return null;

}

