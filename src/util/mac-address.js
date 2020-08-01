const MAC_STR_PATTERN = /^([\da-f]{2}[:-]?){5}[\da-f]{2}$/i;

/**
 * MAC address.
 */
export class MacAddress {
  /**
   * Create a MacAddress instance from a string or buffer.
   * @param {string|Buffer} str - a MAC address as a string or buffer
   */
  constructor(str) {
    if (!Buffer.isBuffer(str)) {
      this._buf = fromString(str.toString());
    } else {
      this._buf = fromBuffer(str);
    }
  }

  /**
   * Format a MacAddress as a colon-delimited string.
   */
  toString() {
    return this._buf.toString('hex').match(/../g).join(':');
  }
}

export function macAddress(str) {
  return (new MacAddress(str)).toString();
}

/**
 * Validate MAC address string format.
 */
function isMacAddressStr(str) {
  return MAC_STR_PATTERN.test(str);
}

function fromString(str) {
  if (!isMacAddressStr(str)) {
    throw new Error(`${str} is not a valid MAC address`);
  }
  let withoutDelimiters = str.replace(/[^\da-f]/ig, '');
  return Buffer.from(withoutDelimiters, 'hex');
}

/**
 * Validate MAC address buffer.
 */
function isMacAddressBuf(buf) {
  return buf.length == 6;
}

function fromBuffer(buf) {
  if (!isMacAddressBuf(buf)) {
    throw new Error(`${buf} is not a valid MAC address`);
  }
  return Buffer.from(buf);
}
