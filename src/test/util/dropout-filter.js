import test from 'tape';
import {createDropoutFilter} from '../../util/dropout-filter';

test('fill spurious zero power measurements with previous value', t => {
  const filter = createDropoutFilter();
  let r;

  r = filter({ power: 100, cadence: 101 });
  t.equal(r.power, 100, 'power (watts)');
  t.equal(r.cadence, 101, 'cadence (rpm)');

  r = filter({ power: 0, cadence: 101 });
  t.equal(r.power, 100, 'power (watts)');
  t.equal(r.cadence, 101, 'cadence (rpm)');

  r = filter({ power: 0, cadence: 101 });
  t.equal(r.power, 0, 'power (watts)');
  t.equal(r.cadence, 101, 'cadence (rpm)');

  t.end();
});

test('fill spurious zero cadence measurements with previous value', t => {
  const filter = createDropoutFilter();
  let r;

  r = filter({ power: 100, cadence: 101 });
  t.equal(r.power, 100, 'power (watts)');
  t.equal(r.cadence, 101, 'cadence (rpm)');

  r = filter({ power: 100, cadence: 0 });
  t.equal(r.power, 100, 'power (watts)');
  t.equal(r.cadence, 101, 'cadence (rpm)');

  r = filter({ power: 100, cadence: 0 });
  t.equal(r.power, 100, 'power (watts)');
  t.equal(r.cadence, 0, 'cadence (rpm)');

  t.end();
});
