import test from 'tape';
import {parse} from '../../bikes/flywheel';

test('parse() parses Flywheel stats messages', t => {
  const buf = Buffer.from('ff1f0c0122000000000000005a00000000000000000000000000000a000000016155', 'hex');
  const {type, payload: {power, cadence}} = parse(buf);
  t.equal(type, 'stats', 'message type');
  t.equal(power, 290, 'power (watts)');
  t.equal(cadence, 90, 'cadence (rpm)');
  t.end();
});
