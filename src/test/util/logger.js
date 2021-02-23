import test from 'tape';
import sinon from 'sinon';
import {Logger} from '../../util/logger';

test('logs messages at and above the specified level', t => {
  const fn = sinon.spy();
  const logger = new Logger({logFunction: fn, level: 'warning'});
  logger.debug('a');
  t.equal(fn.callCount, 0, 'debug is not logged');
  logger.info('a');
  t.equal(fn.callCount, 0, 'info is not logged');
  logger.warning('a');
  t.equal(fn.callCount, 1, 'warning is logged');
  logger.error('a');
  t.equal(fn.callCount, 2, 'error is logged');
  t.end();
});
