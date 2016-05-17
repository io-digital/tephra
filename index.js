
'use strict';

function onMessage(type, message, rinfo) {
  try {
    var decoded = this.RADIUS.decode({
      packet: message,
      secret: this.SHARED_SECRET
    });
    var resolvedType = (
      decoded.code === 'Accounting-Request' ?
      `${decoded.code}-${decoded.attributes['Acct-Status-Type']}` :
      decoded.code
    );
    return this.emit(resolvedType, decoded, rinfo);
  } catch (ex) {
    return this.emit(`error#decode#${type}`, ex.message);
  }
}

function send(buffer, rinfo, onSent) {
  this.send(buffer, 0, buffer.length, rinfo.port, rinfo.address, onSent);
}

// fixme
// -- doesn't care if no vendor id is set
function marshallAttributes(attributes, vendorAttributes) {
  if (!(Array.isArray(attributes) && Array.isArray(vendorAttributes))) {
    throw new Error('Missing required arrays attributes and vendorAttributes');
  }
  return [attributes.concat(['Vendor-Specific', this.VENDOR_ID, vendorAttributes])];

  // todo
  // -- ensure this is functionally equivalent and that
  // the guards work
  // return [
  //   (Array.isArray(attributes) ? attributes : []).concat(
  //     this.VENDOR_ID && Array.isArray(vendorAttributes) ?
  //     ['Vendor-Specific', this.VENDOR_ID, vendorAttributes] : []
  //   )
  // ];
}

const EventEmitter = require('events');
const dgram = require('dgram');
const path = require('path');
const fs = require('fs');

module.exports = (class RadiusServer extends EventEmitter {
  constructor(
    SHARED_SECRET,
    AUTH_PORT,
    ACCT_PORT,
    COA_PORT,
    VENDOR_DICTIONARY_PATH,
    VENDOR_ID
  ) {
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
      // todo
      // -- ensure this is functionally equivalent
      // AUTH: dgram.createSocket('udp4', function() {
      //   onMessage.apply(this, ['auth'].concat(arguments));
      // }.bind(this)),
      // ACCT: dgram.createSocket('udp4', function() {
      //   onMessage.apply(this, ['acct'].concat(arguments));
      // }.bind(this)),
      // COA: dgram.createSocket('udp4', function() {
      //   onMessage.call(this, ['coa'].concat(arguments));
      // }.bind(this))
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

  send(type, code, rinfo, attributes, vendorAttributes, onSent) {
    if (typeof type !== 'string') {
      throw new Error('Missing required string argument type');
    } else {
      try {
        const encoded = this.RADIUS.encode({
          attributes: marshallAttributes.call(this, attributes, vendorAttributes),
          secret: this.SHARED_SECRET,
          code: code
        });
        return send.call(
          this.SOCKETS[type.toUpperCase()],
          encoded,
          rinfo,
          onSent
        );
      } catch (ex) {
        return onSent(ex);
      }
    }
  }

  respond(type, packet, code, rinfo, attributes, vendorAttributes, onResponded) {
    if (typeof type !== 'string') {
      throw new Error('Missing required string argument type');
    } else {
      try {
        const encoded = this.RADIUS.encode_response({
          attributes: marshallAttributes.call(this, attributes, vendorAttributes),
          secret: this.SHARED_SECRET,
          packet: packet,
          code: code
        });
        return send.call(
          this.SOCKETS[type.toUpperCase()],
          encoded,
          rinfo,
          onResponded
        );
      } catch (ex) {
        return onResponded(ex);
      }
    }
  }
});
