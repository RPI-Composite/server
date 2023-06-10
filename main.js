import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import * as catscraper from "./scripts/catalog/quatalog-scraper.js";



//Setting up the app
const port = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(bodyParser.raw({type: 'application/octet-stream', limit: '10mb'}));

app.get('/', async (req, res) => {
    res.send('Welcome to the RPI Composite back end!');
});


//TODO change all these to POST after testing
app.get('/getCoursesCurrent', async (req, res) => {
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

    res.send(JSON.stringify(data));
})


app.post('/*', async (req, res) => {
    res.sendStatus(401);
});

app.listen(port, () => console.log(`App listening on port ${port}`));