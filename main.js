import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import * as catscraper from "./scripts/catalog/quacs-scraper.js";
import * as calscraper from "./scripts/academic-calendar.js";
import * as housescraper from "./scripts/housing.js";
import * as diningscraper from "./scripts/dining.js";


//Setting up the app
const port = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(bodyParser.raw({type: 'application/octet-stream', limit: '10mb'}));

app.get('/', async (req, res) => {
    res.send('Welcome to the RPI Composite back end!');
});


//#region Catalog
app.get('/schools', async (req, res) => {
    try {
        const {year, sem} = req.query;
        const data = await catscraper.getDepts(year, sem);

        if (!data) return res.sendStatus(500);
        else if (typeof data == 'string') return res.send(JSON.stringify({
            type: 1,
            message: data
        }));
    
        res.send(JSON.stringify(data));
    }
    catch (err) {
        console.error(err);
        res.send(500);
    }
});


//TODO change all these to POST after testing
app.get('/coursesCurrent', async (req, res) => {
    try {
        const courses = await catscraper.getCoursesCurrent();
        if (!courses) throw 1;
        res.send(JSON.stringify(courses));
    } catch (err) {
        res.sendStatus(500);
    }
});


app.get('/searchCourses', async (req, res) => {
    // Get the code from the headers later
    const {query, year, term} = req.query;

    if (!query) return res.sendStatus(404);

    const data = await catscraper.searchCourses(query, year, term);
    
    if (!data) return res.sendStatus(404);
    else if (typeof data == 'string') return res.send(JSON.stringify({
        type: 1,
        message: data
    }));

    res.send(JSON.stringify(data));
});


app.get('/courseinfo', async (req, res) => {
    const {query, year, term} = req.query;

    const data = await catscraper.getPrereqs(query, year, term);
    if (!data) return res.sendStatus(404);
    else if (typeof data == 'string') return res.send(JSON.stringify({
        type: 1,
        message: data
    }));

    res.send(JSON.stringify(data));
});


app.get('/prereqs', async (req, res) => {
    const {sem, year, crn} = req.query;

    const data = await catscraper.getPrereqs(crn, sem, year);
    if (!data) return res.sendStatus(404);

    else if (typeof data == 'string') return res.send(JSON.stringify({
        type: 1,
        message: data
    }));
    
    res.send(JSON.stringify(data));
});

//#endregion


//#region Academic Calendar

app.get('/acalRaw', async (req, res) => {
    try {
        const calDataRaw = await calscraper.scrapeCal();
        if (!calDataRaw) return res.sendStatus(500);

        const dataFormatted = calscraper.mapToObj(calDataRaw);
        res.send(JSON.stringify(dataFormatted));
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});


app.get('/acalics', async (req, res) => {
    res.set({'Content-Disposition': 'attachment; rpievents.ics','Content-Type': 'text/ics'});
    
    const calData = await calscraper.createIcs();
    if (!calData) return res.sendStatus(500);

    res.send(calData);
});

//#endregion


//#region HOUSING

app.get('/dorms', async (req, res) => {
    const data = await housescraper.scrapeDinPageMain();
    if (!data) res.sendStatus(500);

    res.send(JSON.stringify(data));
});


app.get('/dorm/:dormid', async (req, res) => {
    const dormUrl = req.params.dormid;
    if (!dormUrl) return res.sendStatus(404);

    const response = await housescraper.getDorm(dormUrl);
    if (!response) return res.sendStatus(404);

    res.send(JSON.stringify(response));
});

//#endregion

//#region DINING

app.get('/diningprices', async (req, res) => {
    const data = await diningscraper.getMealPrices();

    if (!data) res.sendStatus(500);
    res.send(JSON.stringify(data));
});


app.get('/diningplans', async (req, res) => {
    const data = await diningscraper.scrapeDiningPlans();

    if (!data) res.sendStatus(500);
    res.send(JSON.stringify(data));
});


// special hours still broken
app.get('/dininghallinfo', async (req, res) => {
    try {
        const data = await diningscraper.getDiningHallTimes(req.query.alldata);
        if (!data) return res.sendStatus(500);
        res.send(JSON.stringify(data));
    }
    catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});



//#endregion

app.post('/*', async (req, res) => {
    res.sendStatus(401);
});

app.listen(port, () => console.log(`App listening on port ${port}`));