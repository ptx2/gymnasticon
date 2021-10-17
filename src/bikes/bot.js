import dgram from 'dgram';
import {once, EventEmitter} from 'events';
import {Timer} from '../util/timer';

/**
 * Pretends to be a real bike riding at a given fixed cadence and power.
 * The cadence and power can be changed on-the-fly over a UDP socket.
 * Useful for testing without having to use a real bike.
 */
export class BotBikeClient extends EventEmitter {
  /**
   * Create a BotBikeClient instance.
   * @param {number} power - initial power (watts)
   * @param {number} cadence - initial cadence (rpm)
   * @param {number} speed - initial speed (km/h)
   * @param {string} host - host to listen on for udp control interface
   * @param {number} port - port to listen on for udp control interface
   */
  constructor(power, cadence, speed, host, port) {
    super();

    this.onStatsUpdate = this.onStatsUpdate.bind(this);
    this.onUdpError = this.onUdpError.bind(this);
    this.onUdpMessage = this.onUdpMessage.bind(this);

    this.power = power;
    this.cadence = cadence;
    this.speed = speed;
    this._host = host;
    this._port = port;

    this._address = '00:00:00:00:00:00';

    this._timer = new Timer(1);
    this._timer.on('timeout', this.onStatsUpdate);

    this._udpServer = dgram.createSocket('udp4');
    this._udpServer.on('message', this.onUdpMessage);
    this._udpServer.on('error', this.onUdpError);
  }

  async connect() {
    this._udpServer.bind(this._port, this._host);
    this._timer.reset();
    await once(this._udpServer, 'listening');
  }

  get address() {
    return this._address;
  }

  /**
   * @private
   */
  onStatsUpdate() {
    const {power, cadence, speed} = this;
    this.emit('stats', {power, cadence, speed});
  }

  /**
   * @private
   */
  onUdpMessage(msg, rinfo) {
    let j
    try {
      j = JSON.parse(msg);
    } catch (e) {
      console.error(e);
    }
    console.log(j);
    const {power, cadence, speed} = j;
    if (Number.isInteger(power) && power >= 0) {
      this.power = power;
    }
    if (Number.isInteger(cadence) && cadence >= 0) {
      this.cadence = cadence;
    }
    if (!Number.isNaN(speed) && speed >= 0) {
      this.speed = speed;
    }
  }

  /**
   * @private
   */
  onUdpError(err) {
    this.emit('disconnect', {address: this._address})
  }
}
