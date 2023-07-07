import axios, { formToJSON } from "axios";
import * as cheerio from 'cheerio';

const baseurl = 'https://rpi-preview.sodexomyway.com/';

// https://rpi-preview.sodexomyway.com/my-meal-plan


const containsMealTag = (txt) => {
    try {
        return (
            txt.includes('breakfast') ||
            txt.includes('brunch') ||
            txt.includes('lunch') ||
            txt.includes('dinner')
        );
    }
    catch (err) {
        return false;
    }
}


export async function getMealPrices() {
    try {
        const response = await axios.get(`${baseurl}my-meal-plan`);
        const $ = cheerio.load(response.data);
        const priceWrapper = $('.rtf');

        const obj = {};
        priceWrapper.children().each((ind, el) => {
            const div = $(el);
            if (containsMealTag(div.text().toLowerCase())) {
                const txt = div.text().toLowerCase();
                const txtsplit = txt.split(" ").filter((o) => (o.trim().length > 0));
                for (const i in txtsplit) txtsplit[i] = txtsplit[i].trim();

                obj[txtsplit[0]] = { flex: txtsplit[2], other: txtsplit[1] };
            }
        });

        return obj;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


export async function scrapeDiningPlans() {
    const response = await axios.get(`${baseurl}my-meal-plan`);
    const $ = cheerio.load(response.data);
    const mainWrappers = $('.accordion-block');

    const obj = {};

    mainWrappers.each((i, wr) => {
        const wrapperMain = $(wr);
        const titleEl = wrapperMain.children('.accordion-title').first();
        const content = wrapperMain.children('.accordion-panel');
        if (titleEl.text().toLowerCase().indexOf('dining plans') != -1) {
            const title = titleEl.text().trim();
            obj[title] = {};

            content.children().each((i2, elRaw) => {
                const el = $(elRaw);
                // console.log(el.text());
                const lineSplit = el.text().trim().split('--');
                if (lineSplit.length > 1) {
                    obj[title][lineSplit[0].trim()] = lineSplit[1].trim();
                }
            });
        }
    });

    return obj;
}