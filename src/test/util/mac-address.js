import {test} from 'tape';
import {macAddress} from '../../util/mac-address';

test('macAddress() accepts valid inputs', t => {
  const expected = 'aa:bb:cc:01:02:03'
  const cases = [
    ['aA:bB:cC:01:02:03', 'colon delimited string'],
    ['aA-bB-cC-01-02-03', 'hyphen delimited string'],
    ['aAbBcC010203', 'string without delimiter'],
    [Buffer.from('aabbcc010203', 'hex'), 'buffer'],
  ];
  for (let [input, message] of cases) {
    t.equal(macAddress(input), expected, message);
  }
  t.end();
});

test('macAddress() rejects invalid inputs', t => {
  const expected = /is not a valid MAC address/;
  const cases = [
    ['aZ:bB:cC:01:02:03', 'non-hex digits'],
    ['aA!bB!cC!01!02!03', 'invalid delimiter'],
    ['bB:cC:01:02:03', 'too short string'],
    ['aA:bB:cC:01:02:03:04', 'too long string'],
    [Buffer.from('aabbcc0102', 'hex'), 'too short buffer'],
    [Buffer.from('aabbcc01020304', 'hex'), 'too long buffer'],
  ]
  for (let [input, message] of cases) {
    t.throws(() => macAddress(input), expected, message);
  }
  t.end();
});
