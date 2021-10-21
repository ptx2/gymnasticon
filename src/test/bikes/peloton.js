import test from 'tape';
import {decodePeloton} from '../../bikes/peloton';
import {calcPowerToSpeed} from '../../bikes/peloton';

test('decodePeloton() parses Peloton stats messages', t => {
  const bufPower = Buffer.from('f14405363333323038', 'hex');
  const power = decodePeloton(bufPower, bufPower[2], true);
  const bufRPM = Buffer.from('f14103323930d0', 'hex');
  const cadence = decodePeloton(bufRPM, bufRPM[2], false);
  const speed = calcPowerToSpeed(233.6);
  t.equal(power, 233.6, 'power (watts)');
  t.equal(cadence, 92, 'cadence (rpm)');
  t.equal(speed, 22.52, 'speed (km/h)');
  t.end();
});
