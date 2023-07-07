const baseurl = 'https://sll.rpi.edu/';
const ratesurl = 'https://sll.rpi.edu/residential-commons/residential-commons-housing-rates';


import axios, { formToJSON } from "axios";
import * as cheerio from 'cheerio';



/**
 * @param {cheerio.Cheerio<cheerio.Element>} outerwrapper 
 * @returns {cheerio.Cheerio<cheerio.Element>}
 */
function recurseToTable(outerwrapper, depth = 50) {
    if (depth <= 0) return null;
    if (outerwrapper.prop('tagName') == 'tbody') return outerwrapper;

    if (outerwrapper.children('tbody').length > 0) {
        return outerwrapper.children('tbody').first();
    }

    return recurseToTable(outerwrapper.children().first(), depth - 1);
}


export async function scrapeDinPageMain(name = undefined) {
    const response = await axios.get(`${baseurl}housing-comparison`);
    const $ = cheerio.load(response.data);
    const outerwrapper = $("#block-views-block-all-buildings-by-title-block-1");
    
    const obj = {};
    const table = recurseToTable(outerwrapper);
    table.find('tr').each((index, trElement) => {
        try {
            const tr = $(trElement);
      
            const td1 = tr.children().first();
            const td2 = tr.children().next();

            const resYear = td1.text().trim();
            const a = td2.children().first();
            var fullurl = a.prop('href');

            if (fullurl.startsWith('/')) fullurl = fullurl.replace('/', '');
    
            const key = a.text().toLowerCase().replace("hall", "").split(" ").join("").trim();
            obj[key] = { cohort: resYear, url: fullurl, name: a.text().trim() };
        }
        catch (err) {
            console.error(err);
            return null;
        }
    });

    return obj;
}



//#region helper functions

function parseRoomTypes(dataRaw, $) {
    if (!dataRaw) return null;

    try {
        const obj = {};

        const table = dataRaw.children('.table').children('tbody').first();
        table.children().each((index, el) => {
            const tr = $(el);
            const nameRaw = tr.children().first().text().split(" ").filter((o) => (o.trim().length > 0));
            
            for (const i in nameRaw) nameRaw[i] = nameRaw[i].trim().replace("(", "").replace(")", "");

            const name = nameRaw[0];
            var size;
            if (nameRaw.length > 1) size = `${nameRaw[1]} ${nameRaw[2]}`;

            obj[name] = {size: size || 0, cost: 0};

            const amtRaw = tr.children().next().text().trim();
            if (amtRaw != '-') {
                obj[name]['cost'] = amtRaw.replace("$", "").replace(",", "");
            }
        });

        return obj;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


function parseCommInfo(dataRaw, $) {
    try {
        const obj = {};

        const table = dataRaw.children('.table').children('tbody').first();
        table.children().each((index, el) => {
            const tr = $(el);
            const name = tr.children().first().html()
            .replace(/<br>/g, ' ')
            .replace(/\n\s*/g, '');
            
            // for (const i in nameRaw) nameRaw[i] = nameRaw[i].trim().replace("(", "").replace(")", "");
            // const name = nameRaw.join(" ");
            
            var field = tr.children().next();
            var fieldData;

            if (!field.text().trim()) {
                const checkChild = field.children().first();

                if (checkChild && checkChild.prop('tagName') == 'I') {
                    fieldData = checkChild.attr('aria-label');
                } else { fieldData = "No"; }
            } else {
                // fieldData = field.html()
                // .replace(/<br>/g, ' ')
                // .replace(/\n\s*/g, '');
                fieldData = field.text().trim();
            }

            obj[name] = fieldData;
        });

        return obj;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}

//#endregion


export async function getDorm(dormName) {
    try {
        const key = dormName.toLowerCase();
        const allDorms = await scrapeDinPageMain();
        const dorm = allDorms[key];
        if (!dorm) return null;

        const url = `${baseurl}${dorm.url}`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const wrapperMain = $('#block-paperclip-content').children('.content').first();
        
        const obj = {};

        //#region parsong the data
        obj['floorplan'] = wrapperMain.children('.floor-plans').first().children('a').first().prop('href');

        // Room types
        const rawRoomTypes = wrapperMain.children('.room-types').first();
        obj['roomtypes'] = parseRoomTypes(rawRoomTypes, $);

        const rawCommInfo = wrapperMain.children('.community-info').first();
        obj['communityinfo'] = parseCommInfo(rawCommInfo, $);

        const rawRestroomInfo = wrapperMain.children('.restrooms').first();
        obj['restroominfo'] = parseCommInfo(rawRestroomInfo, $);
        
        const rawFurnitureInfo = wrapperMain.children('.furniture').first();
        obj['furnitureinfo'] = parseCommInfo(rawFurnitureInfo, $);
        
        const rawAmenitiesInfo = wrapperMain.children('.amenities').first();
        obj['amentitiesinfo'] = parseCommInfo(rawAmenitiesInfo, $);

        const NDHRaw = wrapperMain.children('.dining').first();
        const NDHEl = NDHRaw.children('.table').children('tbody').first().children().first();
        obj['nearestdininghall'] = NDHEl.children().next().text().trim();

        //#endregion

        return obj;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}