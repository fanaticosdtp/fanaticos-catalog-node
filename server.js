let express = require('express')
let http = require('http')
let app = express()
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

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

app.get('/catalog/categories', (req, res) => {
  let parser = require('simple-excel-to-json');

  let cat = parser.parseXls2Json('data/Categorias.xlsx', { isNested: true })[0].filter( (row) => row.Id != "" );

  let tip = parser.parseXls2Json('data/Varios.xlsx', { isNested: true })[0].filter( (row) => row.Id != "" );

  cat.filter( (item) => item.IdTipo != "" ).forEach( (item) => item.IdTipo = tip.find(element => item.IdTipo === element.Id) );

  res.status(200).send(cat)
})

app.get('/catalog/products/:categoryId', (req, res) => {

  const categoryId = req.params.categoryId;

  let parser = require('simple-excel-to-json');

  let prod = parser.parseXls2Json('data/Productos.xlsx', { isNested: true })[0].filter( (row) => row.Id != "" ).filter( (item) => item.IdCat == categoryId );

  let stock = parser.parseXls2Json('data/Stock.xlsx', { isNested: true })[0].filter( (row) => row.Id != "" );

  let some = parser.parseXls2Json('data/Varios.xlsx', { isNested: true });

  let teams = some[1].filter( (row) => row.Id != "" );

  let size = some[2].filter( (row) => row.Id != "" );

  stock.filter( (item) => item.IdTalle != "" ).forEach( (item) => item.IdTalle = size.find(element => item.IdTalle === element.Id) )

  prod.filter( (item) => item.IdEq != "" ).forEach( (item) => item.IdEq = teams.find(element => item.IdEq === element.Id) );

  prod.forEach( (item) => {
    item.IdStock = stock.filter(element => item.Id === element.IdProd);
    item.Disponible = item.IdStock.filter( element => element.Cantidad > 0).length > 0;
  });

  res.status(200).send(prod)
})

app.get('/catalog/product/:productId', (req, res) => {

  const productId = req.params.productId;

  let parser = require('simple-excel-to-json');

  let prod = parser.parseXls2Json('data/Productos.xlsx', { isNested: true })[0].filter( (row) => row.Id != "" ).filter( (item) => item.Id == productId )[0];

  let stock = parser.parseXls2Json('data/Stock.xlsx', { isNested: true })[0].filter( (row) => row.Id != "" );

  let some = parser.parseXls2Json('data/Varios.xlsx', { isNested: true });

  let teams = some[1].filter( (row) => row.Id != "" );

  let size = some[2].filter( (row) => row.Id != "" );

  prod.IdEq = teams.find(element => prod.IdEq === element.Id);

  prod.IdStock = stock.filter(element => prod.Id === element.IdProd);

  prod.IdStock.forEach( (item) => {
    item.IdTalle = size.find(element => item.IdTalle === element.Id);
    if(!item.IdTalle){
      item.IdTalle = new Object();
      item.IdTalle.Id = 99999;
      item.IdTalle.Nombre = "Talle único";
    }
  });

  if(prod.IdStock)

  res.status(200).send(prod);

})

app.get('/catalog/teams', (req, res) => {

  const productId = req.params.productId;

  let parser = require('simple-excel-to-json');

  let teams = parser.parseXls2Json('data/Varios.xlsx', { isNested: true })[1].filter( (row) => row.Id != "" );

  res.status(200).send(teams);

})

http.createServer(app).listen(8080, () => {

  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), downloadFiles);
  });
  console.log('Server started at http://localhost:8080');
});



/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function downloadFiles(auth) {

  let prod = new Object();
    prod.id = '1Ur0S8n8pApJ6SxhjsM5LFtKU3IL-TD6x';
    prod.name = 'data/Productos.xlsx';
  let cate = new Object();
    cate.id = '1Wpqj_LknYvR5S3sIGCWkQsWgv_1FV5aI';
    cate.name = 'data/Categorias.xlsx';
  let sto = new Object();
    sto.id = '1mkDZ-DEiSeFNmZO8Xg7S8iVXNT_b3FBs';
    sto.name = 'data/Stock.xlsx';
  let vari = new Object();
    vari.id = '1Sjyk4nymNDPs2dRQLm4LFNfkZMoUiajo';
    vari.name = 'data/Varios.xlsx';

  let exFiles = [ prod, cate, sto, vari ]

  exFiles.forEach( item => {
    let dest = fs.createWriteStream(item.name);
    const drive = google.drive({version: 'v3', auth});
    drive.files.get({
      fileId: item.id,
      alt: 'media'
    }, {responseType: 'stream'},
      function(err, res){
          res.data
          .on('end', () => {
              console.log('Done');
          })
          .on('error', err => {
              console.log('Error', err);
          })
          .pipe(dest);
      }
  );
  })

}
