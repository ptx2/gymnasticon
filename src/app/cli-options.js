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

  'bot-power': {
    describe: '<watts> initial bot power',
    type: 'number',
    default: defaults.testPower,
  },
  'bot-cadence': {
    describe: '<rpm> initial bot cadence',
    type: 'number',
    default: defaults.testCadence,
  },
  'bot-host': {
    describe: '<host> for power/cadence control over udp',
    type: 'string',
    default: defaults.testHost,
  },
  'bot-port': {
    describe: '<port> for power/cadence control over udp',
    type: 'number',
    default: defaults.testPort,
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
  }
};
