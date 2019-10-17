import 'zone.js/dist/zone-node';

import * as express from 'express';
import { join } from 'path';

import 'zone.js/dist/zone-node';
import 'reflect-metadata';

import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as fs from 'fs';

// Express server
const app = express();

const PORT = process.env.PORT || 4000;

const DIST_FOLDER = path.join(process.cwd(), 'dist', 'browser');
const indexHtml = fs
  .readFileSync(path.join(DIST_FOLDER, 'index.html'))
  .toString();

// List of all routes we want to prerender
const routes = ['/'];

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {
  AppServerModuleNgFactory,
  LAZY_MODULE_MAP,
  ngExpressEngine,
  renderModuleFactory,
  provideModuleMap
} = require('./dist/server/main');

// Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
app.engine(
  'html',
  ngExpressEngine({
    bootstrap: AppServerModuleNgFactory,
    providers: [provideModuleMap(LAZY_MODULE_MAP)]
  })
);

app.set('view engine', 'html');
app.set('views', DIST_FOLDER);

// Example Express Rest API endpoints
// app.get('/api/**', (req, res) => { });
// Serve static files from /browser
app.get(
  '*.*',
  express.static(DIST_FOLDER, {
    maxAge: '1y'
  })
);

// All regular routes use the Universal engine
app.get('*', (req, res) => {
  res.render('index', { req });
});

// Start up the Node server
app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});

// Run the render process for each of the routes
routes.forEach(route => renderRoute(indexHtml, route));

// This is the function that does the rendering
// and saves the result to the file system
async function renderRoute(document: string, route: string) {
  const html = await renderModuleFactory(AppServerModuleNgFactory, {
    document,
    url: route,
    extraProviders: [provideModuleMap(LAZY_MODULE_MAP)]
  });

  const folder = path.join(DIST_FOLDER, route);
  mkdirp.sync(folder);
  console.log(folder, 'index.html');
  fs.writeFileSync(path.join(folder, 'index.html'), html);
}
