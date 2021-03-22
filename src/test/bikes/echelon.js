import test from 'tape';
import {parse, calculatePower} from '../../bikes/echelon';

test('parse() parses Echelon cadence', t => {
  const buf = Buffer.from('f0d109001300000011003e002c', 'hex');
  const {type, payload: {cadence}} = parse(buf);
  t.equal(type, 'cadence', 'message type');
  t.equal(cadence, 62, 'cadence');
  t.end();
});

test('parse() parses Echelon resistance', t => {
  const buf = Buffer.from('f0d20111d4', 'hex');
  const {type, payload: {resistance}} = parse(buf);
  t.equal(type, 'resistance', 'message type');
  t.equal(resistance, 17, 'resistance');
  t.end();
});

test('calculatePower() calculates Echelon power', t => {
  const cadence = 62;
  const resistance = 17;
  const power = calculatePower(cadence, resistance);
  t.equal(power, 81, 'power (watts)');
  t.end();
});
