import test from 'tape';
import {parse} from '../../bikes/keiser';

test('parse() parses Keiser indoor bike data values', t => {
  const buf = Buffer.from('0201063000383803460573000D00042701000A', 'hex');
  const {power, cadence} = parse(buf);
  t.equal(power, 115, 'power (watts)');
  t.equal(cadence, 82, 'cadence (rpm)');
  t.end();
});
