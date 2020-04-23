let express = require('express')
let http = require('http')
let app = express()

app.get('/categories', (req, res) => {
  debugger;
  let parser = require('simple-excel-to-json');
  let doc = parser.parseXls2Json('data/Categorias.xlsx', { isNested: true });
  res.status(200).send(doc)
})

http.createServer(app).listen(8080, () => {
  console.log('Server started at http://localhost:8080');
});
