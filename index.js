var express = require('express');
var schedule = require('node-schedule');
var https = require('https');
var fs = require('fs');
var path = require('path');
//noinspection NpmUsedModulesInstalled
var moment = require('moment');

var slug, date;
var filePath = path.join(__dirname, 'newreleases.txt');
var jsonPath = path.join(__dirname, 'newreleases.json');
var menuPath = path.join(__dirname, 'menu.json');
var index = path.join(__dirname, '/public/index.html');

var dateRegex = /(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}/g;
var regex = /(^[A-Z]{3}[0-9]{6})\s(.+)\s\$(([0-9]+\.[0-9]{2})|PI)/i;

var app = express();
app.use(express.static('public'));

app.get('/api', function (req, res) {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.send(fs.readFileSync(jsonPath, {encoding: 'utf-8', flag: 'r'}));
});

app.get('/api/menu', function (req, res) {
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    res.send(fs.readFileSync(menuPath, {encoding: 'utf-8', flag: 'r'}));
});

schedule.scheduleJob('42 3 * * * *', function () {
    getFile();
});

function getFile() {
    var target = 'https://www.previewsworld.com/shipping/newreleases.txt';
    var file = fs.createWriteStream(filePath);
    https.get(target, function (response) {
        if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', function () {
                parseFile();
            });
        }
    });
}

function parseFile() {
    fs.readFile(filePath, 'utf-8', function (err, data) {
        var tmp = {};
        var types = [];
        if (err) throw err;
        var lines = data.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line || line.length <= 1) {
                continue;
            }
            if (i == 0) { // parse
                date = line.match(dateRegex)[0];
                date = moment(Date.parse(date)).format('L'); // to prevent momentjs deprecation warning
                tmp['date'] = date;
                continue;
            }
            var values = line.match(regex);
            if (values) {
                var obj = {
                    id: values[1],
                    title: values[2],
                    price: parseFloat(values[3])
                };
                tmp[slug].push(obj);
            } else if (i > 7) { // skip first lines
                var title = line.trim();
                slug = slugify(title);
                var type = {
                    name: title,
                    slug: slug
                };
                types.push(type);
                tmp[slug] = [];
            }
        }
        tmp = JSON.stringify(tmp);
        types = JSON.stringify(types);
        console.log(types);
        fs.writeFileSync(jsonPath, tmp, 'utf8');
        fs.writeFileSync(menuPath, types, 'utf8');
    });
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

app.listen(3000, function () {
    console.log('Listening on port 3000!');
    getFile();
});
