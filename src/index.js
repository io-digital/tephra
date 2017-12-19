
'use strict'

var EventEmitter = require('events')
var dgram = require('dgram')

var radius = require('radius')

var send = require('./send')
var decode = require('./decode')
var encode_request = require('./encode_request')
var encode_response = require('./encode_response')
var access_accept = require('./access_accept')
var access_reject = require('./access_reject')
var accounting_respond = require('./accounting_respond')
var marshall_attributes = require('./marshall_attributes')

module.exports = (class extends EventEmitter {

  constructor(
    SHARED_SECRET,
    AUTH_PORT,
    ACCT_PORT,
    COA_PORT,
    VENDOR_DICTIONARY_PATH,
    VENDOR_ID
  ) {
    super()

    if (!(SHARED_SECRET && AUTH_PORT && ACCT_PORT && COA_PORT)) {
      throw new Error('Missing SHARED_SECRET, AUTH_PORT, ACCT_PORT or COA_PORT arguments')
    }

    if (VENDOR_DICTIONARY_PATH && !VENDOR_ID) {
      throw new Error('Missing required argument VENDOR_ID')
    }

    this.SHARED_SECRET = SHARED_SECRET
    this.AUTH_PORT = AUTH_PORT
    this.ACCT_PORT = ACCT_PORT
    this.COA_PORT = COA_PORT

    // we have to check these again because they are optional
    if (VENDOR_DICTIONARY_PATH && VENDOR_ID) {
      radius.add_dictionary(VENDOR_DICTIONARY_PATH)
      this.VENDOR_ID = VENDOR_ID
    }

    this.SOCKETS = {
      AUTH: dgram.createSocket('udp4', function(message, rinfo) {
        var decoded = decode.call(
          this,
          message,
          function(packet) {
            return packet.code === 'Access-Request'
          },
          this.emit.bind(this, 'error#decode#auth')
        )
        if (!decoded) {
          // seems sensible to default to access-reject here
          return access_reject.call(this, decoded, rinfo)
        }
        this.emit(
          decoded.code,
          decoded,
          rinfo,
          access_accept.bind(this, decoded, rinfo),
          access_reject.bind(this, decoded, rinfo)
        )
      }.bind(this)),
      ACCT: dgram.createSocket('udp4', function(message, rinfo) {
        var decoded = decode.call(
          this,
          message,
          function(packet) {
            return packet.code === 'Accounting-Request'
          },
          this.emit.bind(this, 'error#decode#acct')
        )
        if (!decoded) return
        // emit accounting-request
        this.emit(
          decoded.code,
          decoded,
          rinfo,
          accounting_respond.bind(this, decoded, rinfo)
        )
        // as well as accounting-request-{{status-type}}
        this.emit(
          `${decoded.code}-${decoded.attributes['Acct-Status-Type'] || 'unknown'}`,
          decoded,
          rinfo,
          accounting_respond.bind(this, decoded, rinfo)
        )
      }.bind(this)),
      COA: dgram.createSocket('udp4', function(message, rinfo) {
        var decoded = decode.call(
          this,
          message,
          function(packet) {
            return [
              'Disconnect-ACK',
              'Disconnect-NAK',
              'CoA-ACK',
              'CoA-NAK'
            ].indexOf(packet.code) !== -1
          },
          this.emit.bind(this, 'error#decode#coa')
        )
        if (!decoded) return
        this.emit(decoded.code, decoded, rinfo)
      }.bind(this))
    }
  }

  bind(on_bound) {
    this.SOCKETS.AUTH.bind(this.AUTH_PORT)
    this.SOCKETS.ACCT.bind(this.ACCT_PORT)
    this.SOCKETS.COA.bind(this.COA_PORT)
    return typeof on_bound === 'function' ? on_bound() : this
  }

  unbind(on_unbound) {
    this.SOCKETS.AUTH.close()
    this.SOCKETS.ACCT.close()
    this.SOCKETS.COA.close()
    this.removeAllListeners()
    return typeof on_unbound === 'function' ? on_unbound() : this
  }

  send(
    type,
    code,
    rinfo,
    attributes,
    vendor_attributes,
    on_sent
  ) {
    if (typeof type !== 'string') {
      throw new Error('Missing required string argument type')
    }
    var encoded = encode_request.call(this, code, attributes, vendor_attributes, on_sent)
    if (!encoded) return
    send.call(
      this.SOCKETS[type.toUpperCase()],
      encoded,
      rinfo,
      on_sent
    )
  }

  respond(
    type,
    packet,
    code,
    rinfo,
    attributes,
    vendor_attributes,
    on_responded
  ) {
    if (typeof type !== 'string') {
      throw new Error('Missing required string argument type')
    }
    var encoded = encode_response.call(this, packet, code, attributes, vendor_attributes, on_responded)
    if (!encoded) return
    send.call(
      this.SOCKETS[type.toUpperCase()],
      encoded,
      rinfo,
      on_responded
    )
  }

  disconnect(
    rinfo,
    attributes,
    vendor_attributes,
    on_sent
  ) {
    this.send('coa', 'Disconnect-Request', {
      address: rinfo.address,
      port: rinfo.port
    }, attributes, vendor_attributes, on_sent)
  }
})
