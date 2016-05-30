
'use strict';

function send(buffer, rinfo, onSent) {
  this.send(
    buffer, 0, buffer.length,
    rinfo.port, rinfo.address, onSent
  );
}

function marshallAttributes(attributes, vendorAttributes) {
  var attrs = [];
  if (Array.isArray(attributes) && attributes.length) {
    attrs = attrs.concat(attributes);
  }
  if (this.VENDOR_ID && Array.isArray(vendorAttributes) && vendorAttributes.length) {
    attrs.push(['Vendor-Specific', this.VENDOR_ID, vendorAttributes]);
  }
  return attrs;
}

const EventEmitter = require('events');
const dgram = require('dgram');

module.exports = (class extends EventEmitter {

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
        try {
          var decoded = this.RADIUS.decode({
            packet: message,
            secret: this.SHARED_SECRET
          });
          return this.emit(
            decoded.code, decoded, rinfo,
            (attributes, vendorAttributes, onAccepted) => {
              this.respond(
                'auth', decoded, 'Access-Accept',
                rinfo, attributes, vendorAttributes,
                onAccepted || function() {}
              );
            }, (attributes, vendorAttributes, onRejected) => {
              this.respond(
                'auth', decoded, 'Access-Reject',
                rinfo, attributes, vendorAttributes,
                onRejected || function() {}
              );
            }
          );
        } catch (ex) {
          return this.emit(`error#decode#auth`, ex.message);
        }
      }),
      ACCT: dgram.createSocket('udp4', (message, rinfo) => {
        try {
          var decoded = this.RADIUS.decode({
            packet: message,
            secret: this.SHARED_SECRET
          });
          // emit accounting-request
          this.emit(decoded.code, decoded, rinfo, (attributes, vendorAttributes, onResponded) => {
            this.respond('acct', decoded, 'Accounting-Response', rinfo, attributes, vendorAttributes, onResponded)
          })
          // as well as accounting-request-{{status-type}}
          return this.emit((
            `${decoded.code}-` +
            decoded.attributes['Acct-Status-Type']
          ), decoded, rinfo, (attributes, vendorAttributes, onResponded) => {
            this.respond('acct', decoded, 'Accounting-Response', rinfo, attributes, vendorAttributes, onResponded)
          });
        } catch (ex) {
          return this.emit(`error#decode#acct`, ex.message);
        }
      }),
      COA: dgram.createSocket('udp4', (message, rinfo) => {
        try {
          var decoded = this.RADIUS.decode({
            packet: message,
            secret: this.SHARED_SECRET
          });
          return this.emit(decoded.code, decoded, rinfo);
        } catch (ex) {
          return this.emit(`error#decode#coa`, ex.message);
        }
      })
    };
  }

  bind(onBound) {
    this.SOCKETS.AUTH.bind(this.AUTH_PORT);
    this.SOCKETS.ACCT.bind(this.ACCT_PORT);
    this.SOCKETS.COA.bind(this.COA_PORT);
    return typeof onBound === 'function' ? onBound() : this;
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
          packet: packet,
          code: code,
          attributes: marshallAttributes.call(this, attributes, vendorAttributes),
          secret: this.SHARED_SECRET
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

  disconnect(rinfo, attributes, vendorAttributes, onSent) {
    this.send('coa', 'Disconnect-Request', {
      address: rinfo.address,
      port: rinfo.port
    }, attributes, vendorAttributes, onSent);
  }
});
