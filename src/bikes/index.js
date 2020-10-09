import {FlywheelBikeClient} from './flywheel';
import {PelotonBikeClient} from './peloton';
import {BotBikeClient} from './bot';
import {macAddress} from '../util/mac-address';
import fs from 'fs';

const factories = {
  'flywheel': createFlywheelBikeClient,
  'peloton': createPelotonBikeClient,
  'bot': createBotBikeClient,
  'autodetect': autodetectBikeClient,
};

export function getBikeTypes() {
  return Object.keys(factories);
}

export function createBikeClient(options, noble) {
  const {bike} = options;
  const factory = factories[bike];
  if (!factory) {
    throw new Error(`unrecognized bike type ${bike}`);
  }
  return factory(options, noble);
}

function createFlywheelBikeClient(options, noble) {
  const filters = {};
  if (options.flywheelAddress) filters.address = macAddress(options.flywheelAddress);
  if (options.flywheelName) filters.name = options.flywheelName;
  process.env['NOBLE_HCI_DEVICE_ID'] = options.flywheelAdapter;
  return new FlywheelBikeClient(noble, filters);
}

function createPelotonBikeClient(options, noble) {
  const filters = {};
  if (options.pelotonPath) filters.path = options.pelotonPath;
  return new PelotonBikeClient(noble, filters);
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

function autodetectBikeClient(options, noble) {
  if (fs.existsSync(options.pelotonPath)) {
    return createPelotonBikeClient(options, noble);
  }
  return createFlywheelBikeClient(options, noble);
}
