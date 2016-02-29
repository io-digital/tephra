
'use strict';

function onMessage(type, message, rinfo) {
  var decoded;
  try {
    decoded = this.RADIUS.decode({
      packet: message,
      secret: this.SHARED_SECRET
    });

  } catch (ex) {
    return this.emit(`error#decode#${type}`, ex.message);
  }
  return this.emit(
    (
      decoded.code === 'Accounting-Request' ?
      `${decoded.code}-${decoded.attributes['Acct-Status-Type']}` :
      decoded.code
    ),
    decoded,
    rinfo
  );
}

function marshallAttributes(attributes, vendorAttributes) {
  var allAttributes = [];
  if (Array.isArray(attributes) && attributes.length) {
    allAttributes.push(attributes);
  }
  if (Array.isArray(vendorAttributes) && vendorAttributes.length) {
    allAttributes.push(['Vendor-Specific', this.VENDOR_ID, vendorAttributes]);
  }
  return allAttributes;
}

const EventEmitter = require('events');
const dgram = require('dgram');

module.exports = (class RadiusServer extends EventEmitter {
  constructor(SHARED_SECRET, AUTH_PORT, ACCT_PORT, COA_PORT, VENDOR_DICTIONARY_PATH, VENDOR_ID) {
    super();

    if (!(SHARED_SECRET && AUTH_PORT && ACCT_PORT && COA_PORT)) {
      throw new Error('Missing SHARED_SECRET, AUTH_PORT, ACCT_PORT or COA_PORT arguments');
    }

    if (VENDOR_DICTIONARY_PATH && !VENDOR_ID) {
      throw new Error('Missing required argument VENDOR_ID');
    }

    this.RADIUS = require('radius');
    this.SHARED_SECRET = SHARED_SECRET;
    this.AUTH_PORT = AUTH_PORT;
    this.ACCT_PORT = ACCT_PORT;
    this.COA_PORT = COA_PORT;

    if (VENDOR_DICTIONARY_PATH && VENDOR_ID) {
      this.RADIUS.add_dictionary(VENDOR_DICTIONARY_PATH);
      this.VENDOR_ID = VENDOR_ID;
    }

    this.SOCKETS = {
      AUTH: dgram.createSocket('udp4', (message, rinfo) => {
        onMessage.call(this, 'auth', message, rinfo);
      }),
      ACCT: dgram.createSocket('udp4', (message, rinfo) => {
        onMessage.call(this, 'acct', message, rinfo);
      }),
      COA: dgram.createSocket('udp4', (message, rinfo) => {
        onMessage.call(this, 'coa', message, rinfo);
      })
    };
  }

  bind(onBound) {
    this.SOCKETS.AUTH.bind(this.AUTH_PORT, () => {
      this.SOCKETS.ACCT.bind(this.ACCT_PORT, () => {
        this.SOCKETS.COA.bind(this.COA_PORT, () => {
          return typeof onBound === 'function' ? onBound() : this;
        });
      });
    });
  }

  unbind(onUnbound) {
    this.SOCKETS.AUTH.close();
    this.SOCKETS.ACCT.close();
    this.SOCKETS.COA.close();
    this.removeAllListeners();
    return typeof onUnbound === 'function' ? onUnbound() : this;
  }

  send(type, address, port, code, attributes, vendorAttributes, onSent) {
    try {
      const encoded = this.RADIUS.encode({
        code: code,
        secret: this.SHARED_SECRET,
        attributes: marshallAttributes.call(this, attributes, vendorAttributes)
      });
      return this.SOCKETS[type].send(encoded, 0, encoded.length, port, address, onSent);
    } catch (ex) {
      return onSent(ex);
    }
  }

  respond(type, packet, code, rinfo, attributes, vendorAttributes, onResponded) {
    try {
      const encoded = this.RADIUS.encode_response({
        packet: packet,
        code: code,
        attributes: marshallAttributes.call(this, attributes, vendorAttributes),
        secret: this.SHARED_SECRET
      });
      return this.SOCKETS[type].send(encoded, 0, encoded.length, rinfo.port, rinfo.address, onResponded);
    } catch (ex) {
      return onResponded(ex);
    }
  }
});
