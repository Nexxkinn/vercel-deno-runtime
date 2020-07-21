import build from './build';
import config from './config';
import version from './version';
import startDevServer from './dev';
import {shouldServe} from '@vercel/build-utils';
//import prepareCache from './prepareCache';

export {
  version,
  build,
  config,
  shouldServe,
  startDevServer
}