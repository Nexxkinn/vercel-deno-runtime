import {build} from './build';
import config from './config';
import {shouldServe} from '@vercel/build-utils';
import {version} from './version';

export default {
  version,
  build,
  config,
  prepareCache:{},
  shouldServe
}