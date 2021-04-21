import {FlywheelBikeClient, FLYWHEEL_LOCALNAME} from './flywheel';
import {PelotonBikeClient} from './peloton';
import {EchelonBikeClient} from './echelon';
import {EchelonBikeClient2} from './echelon2';
import {EchelonBikeClient3} from './echelon3';
import {Ic4BikeClient, IC4_LOCALNAME} from './ic4';
import {KeiserBikeClient, KEISER_LOCALNAME} from './keiser';
import {BotBikeClient} from './bot';
import {macAddress} from '../util/mac-address';
import {scan, createFilter, createNameFilter} from '../util/ble-scan';
import fs from 'fs';

// Autodetection on advertisement.localName seems to be enough and
// keeps it simple. Any peripheral property can be tested though,
// e.g. serviceUuids, manufacturerData, rssi, etc.
const autodetectFilters = {
  'flywheel': createNameFilter(FLYWHEEL_LOCALNAME),
  'ic4': createNameFilter(IC4_LOCALNAME),
  'keiser': createNameFilter(KEISER_LOCALNAME),
};

const factories = {
  'flywheel': createFlywheelBikeClient,
  'peloton': createPelotonBikeClient,
  'ic4': createIc4BikeClient,
  'keiser': createKeiserBikeClient,
  'echelon': createEchelonBikeClient,
  'echelon2': createEchelonBikeClient2,
  'echelon3': createEchelonBikeClient3,
  'bot': createBotBikeClient,
  'autodetect': autodetectBikeClient,
};

/**
 * Supported bike types.
 * @returns {string[]} - supported bike types
 */
export function getBikeTypes() {
  return Object.keys(factories);
}

/**
 * Create a BikeClient instance based on the config options.
 * @param {object} options - yargs CLI/config options
 * @param {Noble} noble - a Noble instance
 * @returns {BikeClient} - a BikeClient instance
 */
export async function createBikeClient(options, noble) {
  const {bike} = options;
  const factory = factories[bike];
  if (!factory) {
    throw new Error(`unrecognized bike type ${bike}`);
  }
  return await factory(options, noble);
}

function createFlywheelBikeClient(options, noble) {
  const filter = createFilter({name: options.flywheelName, address: options.flywheelAddress});
  return new FlywheelBikeClient(noble, filter);
}

function createPelotonBikeClient(options, noble) {
  const {pelotonPath} = options;
  return new PelotonBikeClient(pelotonPath);
}

function createIc4BikeClient(options, noble) {
  return new Ic4BikeClient(noble);
}

function createKeiserBikeClient(options, noble) {
  return new KeiserBikeClient(noble);
}

function createEchelonBikeClient(options, noble) {
  return new EchelonBikeClient(noble);
}

function createEchelonBikeClient2(options, noble) {
  return new EchelonBikeClient2(noble);
}

function createEchelonBikeClient3(options, noble) {
  return new EchelonBikeClient3(noble);
}

function createBotBikeClient(options, noble) {
  const args = [
    options.botPower,
    options.botCadence,
    options.botHost,
    options.botPort,
  ]
  return new BotBikeClient(...args);
}

/**
 * Create a BikeClient instance for the first matching autodetected bike.
 * @param {object} options - yargs CLI/config options
 * @param {Noble} noble - a Noble instance.
 * @returns {BikeClient} - a BikeClient instance.
 */
async function autodetectBikeClient(options, noble) {
  if (fs.existsSync(options.pelotonPath)) {
    return createPelotonBikeClient(options, noble);
  }
  const types = Object.keys(autodetectFilters);
  const funcs = Object.values(autodetectFilters);
  const filter = peripheral => funcs.some(f => f(peripheral));
  const peripheral = await scan(noble, null, filter);
  const bike = types.find(f => autodetectFilters[f](peripheral));
  const factory = factories[bike];
  return await factory(options, noble, peripheral);
}
