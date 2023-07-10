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


async function getDiningSpecs(href) {
    try {
        const response = await axios.get(`${baseurl}${href}`);

        const $ = cheerio.load(response.data);
        const pNum = $('.phone').first().text();
        const desc = $('.rtf').first().children().first().text();

        const mapDiv = $('.single-loc-map').first();
        const latitude = mapDiv.attr('data-lat');
        const longitude = mapDiv.attr('data-long');
        
        return [desc, pNum, {lat: latitude, long: longitude}];
    }
    catch (err) {
        console.error(err);
        return [null, null, null];
    }
}


export async function getDiningHallTimes(full = false) {
    try {
        const response = await axios.get(`${baseurl}/dining-near-me/hours`);
        const $ = cheerio.load(response.data);
        const wrapperMain = $('.hours-of-operation');

        /*/ find the current week DOES NOT WORK
        const weekof = wrapperMain.children('.week-of').first();
        weekof.children().each((i, elRaw) => {
            const el = $(elRaw);
        });*/

        // maybe add keys here?
        const obj = {};

        wrapperMain.children('.dining-group').each((ind, dOptsRaw) => {
            try {
                const diningOpts = $(dOptsRaw);
                const cat = diningOpts.children('h2').first().text().toLowerCase();
                obj[cat] = {};

                diningOpts.children('.dining-block').each(async (i, dblockRaw) => {
                    try {
                        const dBlock = $(dblockRaw);
                        const a = dBlock.children('h3').first().children().first();
                        
                        const pName = a.text().toLowerCase();
                        obj[cat][pName] = {url: a.attr('href').substring(1), reghours: {}, spechours: {}};
                        const regHoursDiv = dBlock.children('.reghours');

                        regHoursDiv.children('div').each((i1, rh) => {
                            const reghours = $(rh);
                            const days = reghours.children('.dining-block-days').attr('data-arrayregdays');
                            const hours = reghours.children('.dining-block-hours').text();

                            obj[cat][pName]['reghours'][days] = hours;
                        });
                    }
                    catch (err) {
                        throw err;
                    }
                });
            }
            catch (err) {
                throw err;
            }
        });


        if (full) {
            for (const cat in obj) {
                for (const pName in obj[cat]) {
                    const [desc, pNum, loc] = await getDiningSpecs(obj[cat][pName]['url']);
                    obj[cat][pName]['desc'] = desc;
                    obj[cat][pName]['phone'] = pNum;
                    obj[cat][pName]['loc'] = loc;
                }
            }
        }

        return obj;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}