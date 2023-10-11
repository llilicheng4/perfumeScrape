import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import Adblocker from 'puppeteer-extra-plugin-adblocker';
import fs from 'fs';
import csvParser from 'csv-parser';
import { Page, TimeoutError } from "puppeteer-core";
import mongoose from 'mongoose';
import 'dotenv/config';
import { Perfume } from './dbSchema';
// import UserAgent from 'user-agents';
const UserAgent = require('user-agents');




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


puppeteer.use(StealthPlugin()).use(Adblocker({ blockTrackers: true })).launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false }).then(async browser => {
    await connectDB();
    for (let i = 1; i < 11; i++) {
        for (let j = 1; j < 4; j++) {
            const rows = await readfromcsv(`dataP${i}-G${j}.csv`);

            for (const row of rows) {
                var userAgent = new UserAgent();

                const page = await browser.newPage();

                await page.setUserAgent(userAgent.toString());

                console.log(row);

                await page.goto(row.Link, { timeout: 0 });

                await new Promise(r => setTimeout(r, 5000));

                await readFromPage(page, row);


            }


        }

    }

});

async function readFromPage(page, details) {
    await page.waitForXPath('//*[@id="toptop"]/h1');

    var gender = await page.$eval('#toptop > h1 > small', node => node.innerText);

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

    const pros = await readToArray("pros", page, '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(5) > div > div:nth-child(1) > div:nth-child(2)', '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(5) > div > div:nth-child(1) > div > span');
    const cons = await readToArray("cons", page, '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(5) > div > div:nth-child(2) > div:nth-child(2)', '#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(5) > div > div:nth-child(2) > div > span');

    const summaryHTML = "#main-content > div.grid-x.grid-margin-x > div.small-12.medium-12.large-9.cell > div > div:nth-child(2) > div:nth-child(5) > div > p:nth-child(1)";
    const summary = await readParagraph("summary", page, summaryHTML, summaryHTML);

    const detailHTML = "div.fragrantica-blockquote";
    const dets = await readParagraph("details", page, detailHTML, detailHTML);

    const reviewHTML = ".cell.fragrance-review-box";
    const positiveSelector = "#popular-positive-reviews";
    const negativeSelector = "#popular-negative-reviews";
    const innerSelector = 'div > div > div.flex-child-auto > div > p';
    await (await page.$('#popular-positive-reviews-label')).scrollIntoView();
    await new Promise(r => setTimeout(r, 2000));
    page.click('#popular-positive-reviews-label');
    const positiveReviews = await ReadReviews("positive", page, positiveSelector, reviewHTML, innerSelector);

    await (await page.$('#popular-negative-reviews-label')).scrollIntoView();
    await new Promise(r => setTimeout(r, 2000));
    await page.click('#popular-negative-reviews-label');
    const negativeReviews = await ReadReviews("negative", page, negativeSelector, reviewHTML, innerSelector);

    await addToDB(details.Name, details.Brand, genderNum, accordBars, TopNotesExtract, MiddleNoteExtract, BaseNotesExtract, pros, cons, summary, dets, negativeReviews, positiveReviews);


}
async function ReadReviews(indent: string, page: Page, selectorWait: string, selector: string, innerSelector: string) {
    var cat = [];
    await page.waitForSelector(selectorWait)
        .then(() => console.log("found: ", indent));

    const outerDiv = await page.$(selectorWait);
    const divList = await outerDiv.$$(selector);

    for (let i = 0; i < divList.length; i++) {
        divList[i].scrollIntoView();
        const text = await divList[i].$eval(innerSelector, node => node.textContent);
        cat.push(text);
        await new Promise(r => setTimeout(r, 2000));

        console.log("found: ", i);
    }

    return cat;

}
// async function ReadReviews(indent: string, page: Page, selectorWait: string, selector: string, innerSelector: string) {
//     await page.waitForSelector(selectorWait)
//         .then(() => console.log("found: ", indent));
//     var cats = [];
//     await (await page.$(`${selector}:nth-child(${1}`)).scrollIntoView();
//     await new Promise(r => setTimeout(r, 2000));
//     await (await page.$(`${selector}:nth-child(${3}`)).scrollIntoView();
//     await new Promise(r => setTimeout(r, 2000));
//     await (await page.$(`${selector}:nth-child(${5}`)).scrollIntoView();
//     for (let i = 1; i < 31; i++) {
//         try {

//             // await page.waitForSelector(`${selector}:nth-child(${i + 1})`);
//             await (await page.$(`${selector}:nth-child(${i}) > ${innerSelector}`)).scrollIntoView();
//             await new Promise(r => setTimeout(r, 2000));
//             const box = await page.$eval(`${selector}:nth-child(${i}) > ${innerSelector}`, node => node.textContent);
//             cats.push(box);
//             console.log(box);
//         }
//         catch (e) {
//             console.log(e)
//             break;
//         }
//     }

//     return cats;




// }
// TO-DO create function to find highest value for longevity, sillage etc... remember might have 0 votes
// async function highestNum(indent: string, page, selectorwait: string, selector: string) {
// await page.waitForSelector(selectorwait)
//     .then(() => console.log("found: ", indent))


// const boxes = await page.$$(selector);
// for (const box of boxes) {
//     var categories = [];
//     var nums = [];

//     var cat = await box.$$eval('div > div:nth-child(3) > div > div.cell.small-5.medium-5.large-5 > span', node => node.innerText);
//     categories.push(cat);
//     var num = await box.$$eval('div > div:nth-child(3) > div > div.cell.small-1.medium-1.large-1', node => node.innerText);
//     nums.push(num);
//     for (var i = 1; i <= nums.length; i++) {
//         try {
//             var category: string = categories[i - 1];
//             var num = nums[i - 1];
//             console.log({ category: category, nums: num });
//         } catch {
//             console.log("no bar")
//         }



//     }
// }


// }
//TO-DO create function to get people who likes also like
//maybe save link?
//use database?

async function addToDB(name: string, brand: string, gender: number, accords, top, middle, base, pros, cons, summary, desc, neg, pos) {

    const newPerfume = new Perfume({
        NAME: name,
        BRAND: brand,
        // LAUNCHDATE: number;
        // LONGEVITY: Record<string, number>;
        // SILLAGE: Record<string, number>;
        // "Price/Value": Record<string, number>;
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
        await newPerfume.save().then(savedDoc => {

            if (savedDoc === newPerfume) {
                console.log("saved");
            } else {
                console.log("not saved");
            }
        });
    } catch (e) {
        console.log("error, repeated in DB")
    }
}

async function readToArray(ident: string, page, selectorwait: string, selector: string) {
    await page.waitForSelector(selectorwait).then(() => console.log("found:", ident));

    const NoteDivs = await page.$$(selector);
    var middleNotes = []
    // Extract and print the fruit names
    console.log(NoteDivs.length);
    for (const fruitDiv of NoteDivs) {
        const fruitName = await fruitDiv.evaluate(node => node.textContent.trim());
        middleNotes.push(fruitName);
    }

    console.log(middleNotes);

    return middleNotes;
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

async function readParagraph(identifier: string, page, selector, selectorwait) {
    var pDiv;
    for (let i = 0; i < 4; i++) {
        try {
            await page.waitForSelector(selectorwait, { timeout: 7 }).then(() => console.log('Paragraph found', identifier));
            pDiv = await page.$eval(selector, node => node.textContent);
            return pDiv;
        }
        catch (e) {
            console.log('Paragraph not found', identifier);
        }
    }
    return pDiv = null;
    // console.log(pDiv);


}

