
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

    if(VENDOR_DICTIONARIES){
      this.VENDOR_IDS = {}
      for(let i = 0; i < VENDOR_DICTIONARIES.length; i++){
        if(!VENDOR_DICTIONARIES[i].vendor || !VENDOR_DICTIONARIES[i].path || !VENDOR_DICTIONARIES[i].id){
          throw new Error('Missing vendor details')
        }

        radius.add_dictionary(VENDOR_DICTIONARIES[i].path)
        this.VENDOR_IDS[VENDOR_DICTIONARIES[i].vendor] = VENDOR_DICTIONARIES[i].id
      }
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
    this.send('coa', 'Disconnect-Request', {
      address: rinfo.address,
      port: rinfo.port
    }, attributes, vendor_attributes, on_sent)
  }
})
