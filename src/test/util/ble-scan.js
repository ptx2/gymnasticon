import test from 'tape';
import {createFilter, createNameFilter, createAddressFilter} from '../../util/ble-scan';

// peripherals
const match = {address: '11-11-11-11-11-11', advertisement: { localName: 'Match'}};
const other = {address: '00-00-00-00-00-00', advertisement: { localName: 'Other'}};
const empty = {};

test('createFilter()', t => {
  const allMatch = createFilter({ name: 'Match', address: '11-11-11-11-11-11' });
  const addressMatches = createFilter({ name: 'Natch', address: '11-11-11-11-11-11' });
  const nameMatches = createFilter({ name: 'Match', address: '11-11-11-11-11-10' });
  const noneMatch = createFilter({ name: 'Natch', address: '11-11-11-11-11-10' });
  t.ok(allMatch(match), 'true when all match');
  t.notOk(addressMatches(match), 'false when only address matches');
  t.notOk(nameMatches(match), 'false when only name matches');
  t.notOk(noneMatch(match), 'false when none match');
  t.end();
});

test('createNameFilter()', t => {
  const filter = createNameFilter('Match');
  t.ok(filter(match), 'true when name matches');
  t.notOk(filter(other), 'false when name does not match');
  t.notOk(filter(empty), 'false when name given but peripheral name is missing');
  t.end();
});

test('createAddressFilter()', t => {
  const filter = createAddressFilter('11-11-11-11-11-11');
  t.ok(filter(match), 'true when address matches');
  t.notOk(filter(other), 'false when address does not match');
  t.notOk(filter(empty), 'false when address given but peripheral address is missing');
  t.end();
});
