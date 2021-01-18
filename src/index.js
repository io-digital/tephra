
'use strict'

var EventEmitter = require('events')
var dgram = require('dgram')

var radius = require('radius')

var send = require('./send')
var encode_request = require('./encode_request')
var encode_response = require('./encode_response')
var auth_on_message = require('./auth_on_message')
var acct_on_message = require('./acct_on_message')
var coa_on_message = require('./coa_on_message')

module.exports = (class extends EventEmitter {

  constructor(
    SHARED_SECRET,
    AUTH_PORT,
    ACCT_PORT,
    COA_PORT,
    VENDOR_DICTIONARIES
  ) {
    super()

    if (!(SHARED_SECRET && AUTH_PORT && ACCT_PORT && COA_PORT)) {
      throw new Error('Missing SHARED_SECRET, AUTH_PORT, ACCT_PORT or COA_PORT arguments')
    }

    this.SHARED_SECRET = SHARED_SECRET
    this.AUTH_PORT = AUTH_PORT
    this.ACCT_PORT = ACCT_PORT
    this.COA_PORT = COA_PORT
    this.VENDOR_IDS = {}

    if (Array.isArray(VENDOR_DICTIONARIES) && VENDOR_DICTIONARIES.length) {
      VENDOR_DICTIONARIES.forEach((dict, idx) => {
        if (!(
          typeof dict.vendor === 'string' &&
          dict.vendor.length &&
          typeof dict.path === 'string' &&
          dict.path.length &&
          typeof dict.id === 'number' &&
          dict.id
        )) {
          throw new Error(
            `Expected {vendor: String, path: String, id: Number} at index ${idx} in VENDOR_DICTIONARIES`
          )
        }
        radius.add_dictionary(dict.path)
        this.VENDOR_IDS[dict.vendor] = dict.id
      })
    }

    this.SOCKETS = {
      AUTH: dgram.createSocket('udp4', auth_on_message.bind(this)),
      ACCT: dgram.createSocket('udp4', acct_on_message.bind(this)),
      COA: dgram.createSocket('udp4', coa_on_message.bind(this))
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
    var encoded = encode_request.call(
      this,
      code,
      attributes,
      vendor_attributes,
      on_sent
    )
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
    var encoded = encode_response.call(
      this,
      packet,
      code,
      attributes,
      vendor_attributes,
      on_responded
    )
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
    // override the reply port for the sake of convenience
    rinfo.port = this.COA_PORT

    this.send(
      'coa',
      'Disconnect-Request',
      rinfo,
      attributes,
      vendor_attributes,
      on_sent
    )
  }
})
