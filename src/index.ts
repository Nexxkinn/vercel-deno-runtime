import build from './build';
import config from './config';
import {shouldServe} from '@vercel/build-utils';
import {version} from './version';
//import prepareCache from './prepareCache';

export {
  version,
  build,
  config,
  shouldServe
}