import axios from "axios";
import * as cheerio from 'cheerio';

const quacsCatBasePath = "https://raw.githubusercontent.com/quacs/quacs-data/master/semester_data/";


function getCurrentTerm() {
    var query = `${(new Date()).getFullYear()}`;

    const monthRaw = (new Date()).getMonth();
    if (monthRaw >= 9)
        query += '09';
    else if (monthRaw >= 5)
        query += '05';
    else
        query += '01';
    return query;
}


function formatSem(semRaw) {
    var sem;
    if (semRaw == 0) sem = 1;
    else if (semRaw == 1) sem = 5;
    else if (semRaw == 2) sem = 9;
    else return "incorrect semester!";

    return sem;
}


export async function getDepts(year, semRaw) {
    try {
        const sem = (semRaw) ? formatSem(semRaw) : null;
        if (sem != null && Number(sem) == Number.isNaN()) return sem;
        if (Number(year) != Number.isNaN() && Number(year) < 1999) return "incorrect year!";
        const term = (year && sem) ? `${year}0${sem}` : getCurrentTerm();

        const response = await axios.get(`${quacsCatBasePath}${term}/schools.json`);
        return response.data;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


/**
 * @description get the current courses for the current semester
 */
export async function getCoursesCurrent() {
    var query = getCurrentTerm();

    const response = await axios.get(`${quacsCatBasePath}${query}/courses.json`, { responseType: "json" });
    return response.data;
}


/**
 * @param {Number} year full year
 * @param {Number} semRaw where term is 0 (spring), 1 (summer) or 2 (fall)
 */
export async function getCoursesTerm(year, semRaw) {
    try {
        const sem = (semRaw) ? formatSem(semRaw) : null;
        if (Number(sem) == Number.isNaN()) return sem;
    
        if (Number(year) != Number.isNaN() && Number(year) < 1999) return "incorrect year!";
        const term = (year && sem) ? `${year}0${sem}` : getCurrentTerm();

        if (year == Number.NaN || year < 1999) return "incorrect year!";
        
        const queryurl = `${quacsCatBasePath}${term}/courses.json`;
        const response = await axios.get(queryurl, {responseType: 'json'});
        return response.data;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


export async function searchCourses(termRaw, year = null, sem = null) {
    try {
        const query = termRaw.replaceAll('-', '').toLowerCase().replaceAll(" ", ""); // Remove dash from the search query for comparison
        const allCourses = (sem && year) ? await getCoursesTerm(Number(year), Number(sem)) : await getCoursesCurrent();

        if (typeof allCourses == 'string') return allCourses;

        var byDeptCode = Object.entries(allCourses)
        .filter(o => {
            const courses = o[1];
            return query.includes(courses.code.toLowerCase());
        })[0][1];

        if (!byDeptCode) byDeptCode = allCourses;
        
        const courses = Object.entries(byDeptCode.courses)
        .filter(o => {
            const course = o[1];
            try {
                const courseId = course.id.replaceAll('-', '').replaceAll(" ", "").toLowerCase(); // Remove dash from the key for comparison
                const courseSubj = course.subj.replaceAll('-', '').replaceAll(" ", "").toLowerCase(); // Remove dash from the subject for comparison

                // figure out how to replace the roman numerals
                var courseName = course.title;
                courseName = courseName.replaceAll('-', '').replaceAll(" ", "").toLowerCase(); // Remove dash from the name for comparison

                const matches = (
                    courseId.includes(query) ||
                    courseSubj.includes(query) ||
                    courseName.includes(query)
                );

                return matches;
            } catch (err) { console.error(err); return false; }
        })
        .reduce((obj, key) => {
            const course = key[1];
            obj[course.id] = course;
            return obj;
        }, {});

        return courses;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


export async function getPrereqs(crn, semRaw = null, year = null) {
    if (!crn) return;

    let sem = (semRaw) ? formatSem(semRaw) : null;
    if (Number(sem) == Number.isNaN()) sem = null;
    if (Number(year) != Number.isNaN() && Number(year) < 1999) year = null;
    const term = (year && sem) ? `${year}0${sem}` : getCurrentTerm();

    try {
        const result = await axios.get(`${quacsCatBasePath}${term}/prerequisites.json`);
        const allPrereqs = result.data;

        if (!crn) return allPrereqs;
        const filtered = allPrereqs[crn];

        return filtered;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}