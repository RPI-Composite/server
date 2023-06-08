import axios from "axios";
import * as cheerio from 'cheerio';
import { parseString } from 'xml2js';
import path from "path";
import fs from 'fs';


export async function getCoursesPast(year) {
    const response = await axios.get('https://raw.githubusercontent.com/quatalog/data/main/terms_offered.json', { responseType: "json" });
    return response.data;
}


/**
 * @description get the current courses for the current year? semester?
 */
export async function getCoursesCurrent() {
    const response = await axios.get('https://raw.githubusercontent.com/quatalog/data/main/catalog.json', { responseType: "json" });
    return response.data;
}


export async function searchCourses(termRaw) {
    try {
        const query = termRaw.replace('-', '').toLowerCase().replace(" ", ""); // Remove dash from the search query for comparison
        const allCourses = await getCoursesCurrent();
    
        const filteredData = Object.keys(allCourses)
            .filter(key => {
                try {                    
                    const course = allCourses[key];
                    const courseKey = key.replace('-', '').replace(" ", "").toLowerCase(); // Remove dash from the key for comparison
                    const courseSubj = course.subj.replace('-', '').replace(" ", "").toLowerCase(); // Remove dash from the subject for comparison
                    const courseName = course.name.replace('-', '').replace(" ", "").toLowerCase(); // Remove dash from the name for comparison

                    return (
                        courseKey.includes(query) ||
                        courseSubj.includes(query) ||
                        courseName.includes(query)
                    );
                } catch (err) { console.error(err); return false; }
            })
            .reduce((obj, key) => {
                obj[key] = allCourses[key];
                return obj;
            }, {});
        
        return filteredData;
    }
    catch (err) {
        console.error(err);
        return null;
    }
    
}


export async function getInfo(query = null) {
    try {
        const result = await axios.get('https://raw.githubusercontent.com/quatalog/data/main/prerequisites.json');
        const allPrereqs = result.data;
    
        if (!query) return allPrereqs;
        const filtered = allPrereqs[query];
        
        return filtered;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}