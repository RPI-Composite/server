// this file heavily borrows from https://github.com/ION606/rpi-utils (which I own so no attribution is required)

import axios from "axios";
import * as cheerio from 'cheerio';
import * as ics from 'ics';

const url = "https://info.rpi.edu/registrar/academic-calendar";


// Helper function
export function mapToObj(map) {
    const obj = {};
    for (let [key, value] of map) {
        if (value instanceof Map) {
            obj[key] = mapToObj(value); // Recursively convert nested Map
        } else {
            obj[key] = value;
        }
    }
    return obj;
}



export async function scrapeCal() {
    const m = new Map();

    await axios.get(url)
        .then(res => {
            try {
                const $ = cheerio.load(res.data)
                const calendar = $('#academicCalendar');
                for (const child of calendar.get(0).children) {
                    if (child.name) {
                        // if (child.attributes)
                        var tag;
                        const c = new Map();
                        for (const sub of child.children) {
                            if (sub.name == 'thead') {
                                tag = sub.children[0].children[0].children[0].data;
                            } else {
                                for (const tr of sub.children) {
                                    const tchildren = tr.children;
                                    const d = tchildren.find((c) => (c.attribs.class == "date"));
                                    const a = tchildren.find((c) => (c.attribs.class != "date"));
                                    const txt = a.children[0].children[0].data;
                                    const href = a.children[0].attribs.href;
                                    c.set(d.children[0].data, new Map([['txt', txt], ['href', href]]));
                                }
                            }
                        }

                        m.set(tag, c);
                    }
                }
            }
            catch (err) {
                console.error(err);
                return null;
            }
        });

    return m;
}



export async function createIcs() {
    return new Promise(async (resolve) => {
        try {
            const m = await scrapeCal();
            if (!m) return null;

            const events = [];
            for (const i of m) {
                for (const j of i[1]) {
                    const key = j[0];
                    const val = j[1];
                    var startDate;
                    var endDate;

                    if (key.indexOf("-") != -1) {
                        const keySplit = key.split(" - ");
                        startDate = new Date(keySplit[0]);
                        endDate = new Date(keySplit[1]);
                    } else {
                        startDate = new Date(key);
                        endDate = new Date(key);
                        endDate.setDate(startDate.getDate() + 1);
                    }

                    const timesStart = [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), 0, 0];
                    const timesEnd = [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), 0, 0];

                    events.push({
                        calName: "RPI Academic Calendar",
                        title: val.get("txt"),
                        url: val.get("href"),
                        location: val.get('href'),
                        start: timesStart,
                        end: timesEnd
                    });
                }
            }

            ics.createEvents(events, (error, value) => {
                if (error) {
                    console.log(error);
                    resolve(null);
                }

                resolve(value);
            });
        }
        catch (err) {
            console.error(err);
            return null;
        }
    });
}