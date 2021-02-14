import util from 'util';
import {EventEmitter} from 'events';
import {on} from 'events';
import {macAddress} from '../util/mac-address';

const KEISER_LOCALNAME = "M3";
const KEISER_VALUE_MAGIC = Buffer.from([0x44]); // identifies indoor bike data message
const KEISER_VALUE_IDX_POWER = 6; // 16-bit power (watts) data offset within packet
const KEISER_VALUE_IDX_CADENCE = 4; // 16-bit cadence (1/2 rpm) data offset within packet

const debuglog = util.debuglog('gymnasticon:bikes:keiser');

export class KeiserBikeClient extends EventEmitter {
  constructor(noble, filters) {
    super();
    this.noble = noble;
    this.filters = filters;
    this.state = 'disconnected';
    this.onReceive = this.onReceive.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
  }

  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    // scan
    this.peripheral = await scanKeiser(this.noble);

    this.state = 'connected';
  }

  get address() {
    return macAddress(this.peripheral.address);
  }

  onReceive(data) {
    this.emit('data', data);

    try {
      if (data.advertisement.localName == KEISER_LOCALNAME) {
        console.log('Found Keiser M3: ${data.advertisement.localName} ${data.address} ${data.advertisement.manufacturerData}');
        const {power, cadence} = parse(data.advertisement.manufacturerData);
        this.emit('stats', {power, cadence});
      }
    } catch (e) {
      if (!/unable to parse message/.test(e)) {
        throw e;
      }
    }
  }

  async disconnect() {
    if (this.state !== 'disconnected') return;
    await this.noble.stopScanningAsync();
  }

  onDisconnect() {
    this.state = 'disconnected';

  }
}

export async function scanKeiser(noble) {
  let peripheral
  let results = on(noble, 'discover');
  await noble.startScanningAsync(null, true);
  for await (const [result] of results) {
    if (result.advertisement.localName == KEISER_LOCALNAME) {
      peripheral = result;
      break;
    }
  }
  return peripheral;
}

export function parse(data) {
  if (data.indexOf(KEISER_VALUE_MAGIC) === 0) {
    const power = data.readInt16LE(KEISER_VALUE_IDX_POWER);
    const cadence = Math.round(data.readUInt16LE(KEISER_VALUE_IDX_CADENCE) / 10);
    return {power, cadence};
  }
  throw new Error('unable to parse message');
}
