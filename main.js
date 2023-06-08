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
    const code = req.query['code'];
    if (!code) return res.sendStatus(404);

    const data = await catscraper.searchCourses(code);
    
    if (!data) return res.sendStatus(404);
    res.send(JSON.stringify(data));
});


app.get('/courseinfo', async (req, res) => {
    const key = req.query['code'];
    if (!key) return res.sendStatus(404);

    const data = await catscraper.getInfo(key);
    if (!data) return res.sendStatus(404);

    res.send(JSON.stringify(data));
})


app.post('/*', async (req, res) => {
    res.sendStatus(401);
});

app.listen(port, () => console.log(`App listening on port ${port}`));