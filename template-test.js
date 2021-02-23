import Handlebars from 'handlebars';
import jsonpath from 'jsonpath';
import fs from 'fs/promises';
import path from 'path';
import dateformat from 'dateformat';

const __dirname = path.dirname((new URL(import.meta.url)).pathname);

Handlebars.registerHelper('jp', function (root, path, context) {
    if(Array.isArray(root)) {
        root = {__temp: root};
        path = path.replace('$', "$['__temp']");
    }
    try{
        return jsonpath.query(root, path);
    } catch (err) {
        console.error(err);
    }
});

Handlebars.registerHelper('jp-single', function(root, path, context) {
    if(Array.isArray(root)) {
        root = {__temp: root};
        path = path.replace('$', "$['__temp']");
    }
    try{
        return jsonpath.query(root, path)[0];
    } catch (err) {
        console.error(err);
    }
});

Handlebars.registerHelper('as-date', function(dateString, formatString) {
    const date = new Date(dateString);
    return dateformat(date, formatString);
})

async function run() {
    let results = JSON.parse((await fs.readFile(path.resolve(__dirname, 'results.json'))).toString('utf8'));
    const template = Handlebars.compile((await fs.readFile(path.resolve(__dirname, './src/templates/email.tmpl'))).toString('utf8'));
    const data = { resultCount: 0, resorts: [] };
    results = Array.isArray(results) ? results : [results];
    results.forEach((result) => {
        data.resultCount += result.numberOfResults;
        result.bookableResults.forEach((bResult) => {
            const resortId = bResult.property.propertyNumber;
            let resortData = data.resorts.find(res => res.propertyNumber === resortId);
            if (!resortData) {
                const resortIdx = data.resorts.push(JSON.parse(JSON.stringify(bResult.property))) - 1;
                resortData = data.resorts[resortIdx];
                resortData.stays = [];
            }
            resortData.stays.push(bResult);
        })
    });
    fs.writeFile(path.join(__dirname, 'email-output.html'),template(data));
}

run();