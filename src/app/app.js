import util from 'util';
import noble from '@abandonware/noble';
import bleno from '@abandonware/bleno';

import {once} from 'events';

import {GymnasticonServer} from '../servers/ble';
import {AntServer} from '../servers/ant';
import {createBikeClient, getBikeTypes, getReceiveTriggers} from '../bikes';
import {Simulation} from './simulation';
import {Timer} from '../util/timer';
import {Logger} from '../util/logger';
import {createAntStick} from '../util/ant-stick';

import {RECEIVE_TRIGGER} from '../bikes/peloton';

const debuglog = util.debuglog('gymnasticon:app:app');

export {getBikeTypes, getReceiveTriggers};

export const defaults = {
  // bike options
  bike: 'autodetect', // bike type
  bikeReceiveTimeout: 4, // timeout for receiving stats from bike
  bikeConnectTimeout: 0, // timeout for establishing bike connection
  bikeAdapter: 'hci0', // bluetooth adapter to use for bike connection (BlueZ only)

  // flywheel bike options
  flywheelAddress: undefined, // mac address of bike
  flywheelName: 'Flywheel', // name of bike

  // peloton bike options
  pelotonPath: '/dev/ttyUSB0', // default path for usb to serial device
  pelotonReceiveTrigger: RECEIVE_TRIGGER.EVENT, // whether to proactively poll measurements or wait for event

  // test bike options
  botPower: 0, // power
  botCadence: 0, // cadence
  botHost: '0.0.0.0', // listen for udp message to update cadence/power
  botPort: 3000,

  // server options
  serverAdapter: 'hci0', // adapter for receiving connections from apps
  serverName: 'Gymnasticon', // how the Gymnasticon will appear to apps
  serverPingInterval: 1, // send a power measurement update at least this often

  // ANT+ server options
  antDeviceId: 11234, // random default ANT+ device id

  // power adjustment (to compensate for inaccurate power measurements on bike)
  powerScale: 1.0, // multiply power by this
  powerOffset: 0.0, // add this to power
};

/**
 * Gymnasticon App.
 *
 * Converts the Flywheel indoor bike's non-standard data protocol into the
 * standard Bluetooth Cycling Power Service so the bike can be used with
 * apps like Zwift.
 */
export class App {
  /**
   * Create an App instance.
   */
  constructor(options = {}) {
    const opts = {...defaults, ...options};

    this.power = 0;
    this.crank = {revolutions: 0, timestamp: -Infinity};

    process.env['NOBLE_HCI_DEVICE_ID'] = opts.bikeAdapter;
    process.env['BLENO_HCI_DEVICE_ID'] = opts.serverAdapter;
    if (opts.bikeAdapter === opts.serverAdapter) {
      process.env['NOBLE_MULTI_ROLE'] = '1'
    }

    this.logger = new Logger();
    this.bike = createBikeClient(opts, noble);
    this.simulation = new Simulation();
    this.server = new GymnasticonServer(bleno, opts.serverName);

    this.antStick = createAntStick(opts);
    this.antServer = new AntServer(this.antStick, {deviceId: opts.antDeviceId});
    this.antStick.on('startup', this.onAntStickStartup.bind(this));

    this.pingInterval = new Timer(opts.serverPingInterval);
    this.statsTimeout = new Timer(opts.bikeStatsTimeout, {repeats: false});
    this.connectTimeout = new Timer(opts.bikeConnectTimeout, {repeats: false});
    this.powerScale = opts.powerScale;
    this.powerOffset = opts.powerOffset;

    this.pingInterval.on('timeout', this.onPingInterval.bind(this));
    this.statsTimeout.on('timeout', this.onBikeStatsTimeout.bind(this));
    this.connectTimeout.on('timeout', this.onBikeConnectTimeout.bind(this));
    this.bike.on('disconnect', this.onBikeDisconnect.bind(this));
    this.bike.on('stats', this.onBikeStats.bind(this));
    this.simulation.on('pedal', this.onPedalStroke.bind(this));
  }

  async run() {
    try {
      const [state] = await once(noble, 'stateChange');
      if (state !== 'poweredOn')
        throw new Error(`Bluetooth adapter state: ${state}`);

      this.logger.log('connecting to bike...');
      this.connectTimeout.reset();
      await this.bike.connect();
      this.connectTimeout.cancel();
      this.logger.log(`bike connected ${this.bike.address}`);
      this.server.start();
      this.startAnt();
      this.pingInterval.reset();
      this.statsTimeout.reset();
    } catch (e) {
      this.logger.error(e);
      process.exit(1);
    }
  }

  onPedalStroke(timestamp) {
    this.pingInterval.reset();
    this.crank.timestamp = timestamp;
    this.crank.revolutions++;
    let {power, crank} = this;
    this.logger.log(`pedal stroke [timestamp=${timestamp} revolutions=${crank.revolutions} power=${power}W]`);
    this.server.updateMeasurement({ power, crank });
  }

  onPingInterval() {
    debuglog(`pinging app since no stats or pedal strokes for ${this.pingInterval.interval}s`);
    let {power, crank} = this;
    this.server.updateMeasurement({ power, crank });
  }

  onBikeStats({ power, cadence }) {
    power = power > 0 ? Math.max(0, Math.round(power * this.powerScale + this.powerOffset)) : 0;
    this.logger.log(`received stats from bike [power=${power}W cadence=${cadence}rpm]`);
    this.statsTimeout.reset();
    this.power = power;
    this.simulation.cadence = cadence;
    let {crank} = this;
    this.server.updateMeasurement({ power, crank });
    this.antServer.updateMeasurement({ power, cadence });
  }

  onBikeStatsTimeout() {
    this.logger.log(`timed out waiting for bike stats after ${this.statsTimeout.interval}s`);
    process.exit(0);
  }

  onBikeDisconnect({ address }) {
    this.logger.log(`bike disconnected ${address}`);
    process.exit(0);
  }

  onBikeConnectTimeout() {
    this.logger.log(`bike connection timed out after ${this.connectTimeout.interval}s`);
    process.exit(1);
  }

  startAnt() {
    if (!this.antStick.is_present()) {
      this.logger.log('no ANT+ stick found');
      return;
    }
    if (!this.antStick.open()) {
      this.logger.error('failed to open ANT+ stick');
    }
  }

  onAntStickStartup() {
    this.logger.log('ANT+ stick opened');
    this.antServer.start();
  }
}
