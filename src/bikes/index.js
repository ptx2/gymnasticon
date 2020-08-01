import {FlywheelBikeClient} from './flywheel';
import {BotBikeClient} from './bot';
import {macAddress} from '../util/mac-address';

const factories = {
  'flywheel': createFlywheelBikeClient,
  'bot': createBotBikeClient,
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

function createBotBikeClient(options, noble) {
  const args = [
    options.botPower,
    options.botCadence,
    options.botHost,
    options.botPort,
  ]
  return new BotBikeClient(...args);
}
