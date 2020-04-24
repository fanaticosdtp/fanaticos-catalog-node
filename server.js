let express = require('express')
let http = require('http')
let app = express()
// Get the adodb module
const ADODB = require('node-adodb');
const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=data/Fanaticos1.mdb;');

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');

    // authorized headers for preflight requests
    // https://developer.mozilla.org/en-US/docs/Glossary/preflight_request
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();

    app.options('*', (req, res) => {
        // allowed XHR methods
        res.header('Access-Control-Allow-Methods', 'GET, PATCH, PUT, POST, DELETE, OPTIONS');
        res.send();
    });
});

app.get('/catalog/categories/access', (req, res) => {

  connection
    .query('SELECT * FROM Categorias')
    .then(data => {
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(error => {
      console.error(error);
    });

res.status(200).send("ok")

})

app.get('/catalog/categories', (req, res) => {
  let parser = require('simple-excel-to-json');
  let doc = parser.parseXls2Json('data/Categorias.xlsx', { isNested: true })[0];
  res.status(200).send(doc)
})

http.createServer(app).listen(8080, () => {
  console.log('Server started at http://localhost:8080');
});
