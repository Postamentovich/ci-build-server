const express = require('express');
const app = express();
const port = 3000;
const config = require('./server-conf.json');

app.get('/', (req, res) => res.send('Hello World!'));

console.log(config);

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
