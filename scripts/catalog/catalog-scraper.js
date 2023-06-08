/*/ I want to die this has been made obsolete by the quatalog-scraper.js file

import axios from "axios";
import * as cheerio from 'cheerio';
import { parseString } from 'xml2js';
import path from "path";
import fs from 'fs';
import { exit } from "process";

const baseurl = 'http://catalog.rpi.edu';
const headers = {
    "Content-Type": "application/x-www-form-urlencoded"
}

const apibaseurl = "http://rpi.apis.acalog.com/v1/";
const keyparam = "?key=3eef8a28f26fb2bcc514e6f1938929a1f9317628&format=xml";
// CHUNK_SIZE = 100


//Set up the codes for the depts to be reused
const deptsToCodes = new Map();
async function getDeptCodes() {
    const response = await axios.get(baseurl + '/content.php?navoid=605', headers);
    const $ = cheerio.load(response.data);

    //Find the <td> with the codes
    const codetableRaw = $('h3:contains("Subject Codes")').parent();
    //Map the codes to the names
    var beginCodes = false;

    for (const pRaw of codetableRaw.children()) {
        if ($(pRaw).text().toLocaleLowerCase().includes('subject codes')) {
            beginCodes = true;
            continue;
        }
        if (!beginCodes) continue;

        const p = $(pRaw);
        if (p.children().length == 0) continue;
        const pChildNodes = p.contents().filter(function () { return this.nodeType === 3; });

        pChildNodes.each(function () {
            const txt = $(this).text().trim();
            if (!txt.includes("STSO")) {
                const txtsplit = txt.split(" ");

                deptsToCodes.set(txtsplit.slice(1).join(" "), txtsplit[0]);
            }
        });

        //manual add because I can't figure out why this is the only one that ddoesn't parse
        deptsToCodes.set("Science Technology and Society", "STSO");
    }
}
getDeptCodes().then(() => {
    console.log(deptsToCodes);
})


// get all catalog years
export async function getYears() {
    const response = await axios.get(baseurl + '/index.php', headers);
    const $ = cheerio.load(response.data);

    const dropdownEntries = $('select[title="Select a Catalog"] > option');
    const dmapped = dropdownEntries.toArray().map((e) => {
        var txt = $(e).text();
        txt = txt.replace('Rensselaer', '').replace('[Archived Catalog]', '').trim();
        return [e.attribs.value, txt];
    });

    return dmapped;
}


const findKeyByPartialMatch = (partialKey) => {
    for (let key of deptsToCodes.keys()) {
        if (key.includes(partialKey) || partialKey.includes(key)) {
            return key;
        }
    }
    return null;
};

export async function getCategories() {
    const url = baseurl + '/content.php?navoid=601';
    const response = await axios.get(url, headers);
    const $ = cheerio.load(response.data);
    const blockMain = $('.block_content');
    const deptContainer = blockMain.children('div').first();

    const catMap = {};

    var title, href, children;
    for (const c of deptContainer.children()) {
        const elem = $(c);

        if (elem.prop('tagName') == 'H3') title = elem.text().trim();
        else if (elem.prop('tagName') == 'A') href = elem.prop('href');

        else if (elem.prop('tagName') == 'DIV') {
            children = {};
            var titleNested, hrefNested;
            for (const CR of elem.children()) {
                const childNode = $(CR);

                if (childNode.prop('tagName') == "H4") titleNested = childNode.text().trim();
                else if (childNode.prop('tagName') == "A") hrefNested = childNode.prop('href');
                else if (childNode.prop('tagName') == "BR") {
                    const key = findKeyByPartialMatch(titleNested);
                    if (key && titleNested && hrefNested) children[titleNested] = { href: hrefNested, code: deptsToCodes.get(key) };
                }
            }

            if (title && children) {
                catMap[title] = children;
            }
        }
    }

    return catMap;
}


export async function getCourseIds(catalogId) {
    try {
        const response = await axios.get(`${apibaseurl}search/courses${keyparam}&method=listing&options[limit]=0&catalog=${catalogId}`);
        const htmlContent = response.data;
        const coursesXml = cheerio.load(htmlContent);
        const ids = coursesXml('id').map((index, element) => coursesXml(element).text()).get();
        return ids;
    } catch (error) {
        // Handle error
        console.error(error);
        return [];
    }
}


export async function scrapeCategory(category) {
    try {
        const response = await axios.get(`${apibaseurl}search/courses${keyparam}&method=listing&options[limit]=0&catalog=24`);

        let courses;
        parseString(response.data, (err, result) => {
            if (err) {
                throw err;
            }

            courses = result.catalog.search; // .map(course => course.id[0]);
        });

        /**
            [{
                hits: [ '1961' ],
                time: [ '0.0708627700805664' ],
                results: [{ result: [{
                    id: [ '51198' ],
                    name: [ 'Beginners Architecture Career Discovery Program' ],
                    altname: [ 'ARCH 1200 - Beginners Architecture Career Discovery Program' ],
                    state: [ { code: [Array], name: [Array], parent: [Array] } ],
                    prefix: [ 'ARCH' ],
                    code: [ '1200' ],
                    type: [ { _: 'Architecture', '$': [Object] } ] },]
            }]
         * /
        console.log(courses[0].results[0].result[0]);
    } catch (error) {
        console.error('Error:', error);
        // return [];
    }
}


function getCatalogDescription(fields, courseName) {
    let foundName = false;

    for (const field of fields) {
        if (!foundName) {
            const name = field['$'].xpath;
            if (name && name[0] === courseName) {
                foundName = true;
            }
        } else {
            const description = field['$'].xpath;
            if (description) {
                const cleanDescription = description.map(text => text.trim()).join(' ').trim();
                if (cleanDescription.startsWith('Prerequisite')) {
                    return '';
                } else if (cleanDescription.length > 10) {
                    return cleanDescription;
                }
            }
        }
    }

    return '';
}


export async function getCourseData(catalogId, courseIds) {
    const CHUNK_SIZE = 100;
    const courseChunks = [];

    for (let i = 0; i < courseIds.length; i += CHUNK_SIZE) {
        const chunk = courseIds.slice(i, i + CHUNK_SIZE);
        courseChunks.push(chunk);
    }

    const data = {};

    for (const chunk of courseChunks) {
        const ids = chunk.map(id => `&ids[]=${id}`).join('');
        const url = `${apibaseurl}content${keyparam}&method=getItems&options[full]=1&catalog=${catalogId}&type=courses${ids}`;

        try {
            const response = await axios.get(url);
            const xmlData = response.data;

            let courses;
            parseString(xmlData, (err, result) => {
                if (err) {
                    throw err;
                }

                // console.log(result.catalog.courses[0]);
                for (const i in result.catalog.courses) {
                    for (const j in result.catalog.courses[i].course) {
                        result.catalog.courses[i].course = result.catalog.courses[i].course.filter((course) => !course['$']['child-of']);
                    }
                }

                courses = result.catalog.courses;
            });

            for (const course of courses) {
                console.log("title:", course.course[0]['a:title']);
                console.log("content:", course.course[0]['a:content']);
                exit(12);

                continue;
                const subj = course[0].prefix[0].trim();
                const crse = course[0].code[0].trim();
                const courseName = course[0].name[0].trim();
                const fields = course[0].field;

                data[`${subj}-${crse}`] = {
                    subj: subj,
                    crse: crse,
                    name: courseName,
                    description: getCatalogDescription(fields, courseName),
                };
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    return data;
}


const saveCal = async (data, year) => {
    const years = year.split('-');
    const directories = [`${years[0]}09`, `${years[1]}01`, `${years[1]}05`];

    try {
        for (const directory of directories) {
            const directoryPath = path.join('data', directory);
            fs.mkdirSync(directoryPath, { recursive: true });

            const filePath = path.join(directoryPath, 'catalog.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding: 'utf8' });
        }

        return {
            statusCode: 200,
            body: 'Catalog saved successfully.',
        };
    } catch (error) {
        console.error('Error saving catalog:', error);
        return {
            statusCode: 500,
            body: 'Failed to save catalog.',
        };
    }
};


export async function getCat(catalogId) {
    try {
        const cids = await getCourseIds(catalogId);
        const data = await getCourseData(catalogId, cids);
        saveCal(data);
    }
    catch (err) {
        console.error(err);
        return null;
    }
}*/