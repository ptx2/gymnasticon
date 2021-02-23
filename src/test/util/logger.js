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

test('message level can be used in formatting', t => {
  const fn = sinon.spy();
  const logger = new Logger({logFunction: fn, level: 'warning'});
  logger.warning('a');
  t.ok(fn.calledWith('warning', 'a'), 'level is first argument');
  logger.error('a');
  t.ok(fn.calledWith('error', 'a'), 'level is first argument');
  t.end();
});

test('levels can be customized', t => {
  const levels = ['foo', 'bar', 'baz'];
  const fn = sinon.spy();
  const logger = new Logger({logFunction: fn, level: 'bar', levels});
  logger.foo('a');
  t.ok(fn.notCalled);
  logger.bar('a');
  t.ok(fn.calledWith('bar', 'a'));
  logger.baz('a');
  t.ok(fn.calledWith('baz', 'a'));
  t.throws(() => {
    const logger = new Logger({level: 'quux', levels});
  }, /unrecognized/);
  t.end();
});

test('logs to console with timestamp by default', t => {
  const fn = sinon.stub(console, 'log');
  const logger = new Logger({level: 'info'});
  const now = new Date();
  const timestamp = `[${now.toISOString()}]`;
  const clock = sinon.useFakeTimers(now.getTime());
  logger.info('a', 'b');
  clock.restore();
  sinon.restore();
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
