#!/usr/bin/env node

import yargs from 'yargs';
import {App} from './app';
import {options} from './cli-options';
import {version} from '../../package.json';

const banner = String.raw`
   __o  
 _ \<_  
(_)/(_) 

Gymnasticon
v${version}
`

const argv = yargs
  .usage(`${banner}\nusage: gymnasticon [OPTIONS]`)
  .options(options)
  .help()
  .version()
  .alias('h', 'help')
  .argv;

(async () => {
  const app = new App(argv);
  await app.run();
})();
