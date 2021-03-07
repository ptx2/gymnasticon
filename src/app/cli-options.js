import {defaults, getBikeTypes} from './app';

export const options = {
  'config': {
    describe: '<filename> load options from json file',
    type: 'string',
  },

  'bike': {
    describe: '<type>',
    type: 'string',
    choices: getBikeTypes(),
    default: defaults.bike,
  },

  'bike-connect-timeout': {
    describe: '<seconds>',
    type: 'number',
    default: defaults.bikeConnectTimeout,
  },
  'bike-receive-timeout': {
    describe: '<seconds>',
    type: 'number',
    default: defaults.bikeReceiveTimeout,
  },
  'bike-adapter': {
    describe: '<name> for bike connection',
    default: defaults.bikeAdapter,
  },

  'flywheel-address': {
    describe: '<macaddr>',
  },
  'flywheel-name': {
    describe: '<name>',
  },
  'peloton-path': {
    describe: '<path> usb serial device path',
    type: 'string',
    default: defaults.pelotonPath,
  },
  'bot-power': {
    describe: '<watts> initial bot power',
    type: 'number',
    default: defaults.botPower,
  },
  'bot-cadence': {
    describe: '<rpm> initial bot cadence',
    type: 'number',
    default: defaults.botCadence,
  },
  'bot-host': {
    describe: '<host> for power/cadence control over udp',
    type: 'string',
    default: defaults.botHost,
  },
  'bot-port': {
    describe: '<port> for power/cadence control over udp',
    type: 'number',
    default: defaults.botPort,
  },

  'server-adapter': {
    describe: '<name> for app connection',
    default: defaults.serverAdapter,
  },
  'server-name': {
    describe: '<name> used for Bluetooth advertisement',
    default: defaults.serverName,
  },
  'server-ping-interval': {
    describe: '<seconds> ping app when user not pedaling',
    type: 'number',
    default: defaults.serverPingInterval,
  },
  'ant-device-id': {
    describe: '<id> ANT+ device id for bike power broadcast',
    type: 'number',
    default: defaults.antDeviceId,
  },
  'power-scale': {
    describe: '<value> scale watts by this multiplier',
    type: 'number',
    default: defaults.powerScale,
  },
  'power-offset': {
    describe: '<value> add this value to watts',
    type: 'number',
    default: defaults.powerOffset,
  }
};
