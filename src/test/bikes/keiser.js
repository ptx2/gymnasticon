import test from 'tape';
import {parse} from '../../bikes/keiser';
import {bikeVersion} from '../../bikes/keiser';

/**
 * See https://dev.keiser.com/mseries/direct/#data-parse-example for a
 * data parse example of the below test case
 */
test('parse() parses Keiser indoor bike data values', t => {
  const buf = Buffer.from('0201063000383803460573000D00042701000A', 'hex');
  const {type, payload: {power, cadence, speed}} = parse(buf);
  t.equal(type, 'stats', 'message type');
  t.equal(power, 115, 'power (watts)');
  t.equal(cadence, 82, 'cadence (rpm)');
  t.equal(speed, 23, 'speed (km/h)');
  t.end();
});

test('bikeVersion() Tests Keiser bike version (6.40)', t => {
  const bufver = Buffer.from('0201064000383803460573000D00042701000A', 'hex');
  const {version, timeout} = bikeVersion(bufver);
  t.equal(version, '6.40', 'Version: 6.40');
  t.equal(timeout, 1, 'Timeout: 1 second');
  t.end();
});

test('bikeVersion() Tests Keiser bike version (6.30)', t => {
  const bufver = Buffer.from('0201063000383803460573000D00042701000A', 'hex');
  const {version, timeout} = bikeVersion(bufver);
  t.equal(version, '6.30', 'Version: 6.30');
  t.equal(timeout, 1, 'Timeout: 1 second');
  t.end();
});

test('bikeVersion() Tests Keiser bike version (6.22)', t => {
  const bufver = Buffer.from('0201062200383803460573000D00042701000A', 'hex');
  const {version, timeout} = bikeVersion(bufver);
  t.equal(version, '6.22', 'Version: 6.22');
  t.equal(timeout, 7, 'Timeout: 7 second');
  t.end();
});

test('bikeVersion() Tests Keiser bike version (5.12)', t => {
  const bufver = Buffer.from('0201051200383803460573000D00042701000A', 'hex');
  const {version, timeout} = bikeVersion(bufver);
  t.equal(version, '5.12', 'Version: 5.12');
  t.equal(timeout, 7, 'Timeout: 7 second');
  t.end();
});
