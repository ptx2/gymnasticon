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

test('prepends current timestamp to log messages', t => {
  const fn = sinon.spy();
  const logger = new Logger({logFunction: fn, level: 'info'});
  const now = new Date();
  const timestamp = `[${now.toISOString()}]`;
  const clock = sinon.useFakeTimers(now.getTime());
  logger.info('a', 'b');
  clock.restore();
  t.ok(fn.calledOnce);
  t.ok(fn.calledWith(timestamp, 'a', 'b'));
  t.end();
});

test('throws when log level is unrecognized', t => {
  t.throws(() => {
    new Logger({level: 'does-not-exist'});
  }, /unrecognized/);
  t.end();
});
