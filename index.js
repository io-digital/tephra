
'use strict'

function decode(message, on_error) {
  try {
    return this.RADIUS.decode({
      packet: message,
      secret: this.SHARED_SECRET
    })
  } catch (err) {
    on_error(err.message)
  }
}

function send(buffer, rinfo, on_sent) {
  this.send(
    buffer,
    0,
    buffer.length,
    rinfo.port,
    rinfo.address,
    on_sent
  )
}

function marshall_attributes(attributes, vendor_attributes) {
  var marshalled = []
  if (Array.isArray(attributes) && attributes.length) {
    marshalled = marshalled.concat(attributes)
  }
  if (this.VENDOR_ID && Array.isArray(vendor_attributes) && vendor_attributes.length) {
    marshalled.push(['Vendor-Specific', this.VENDOR_ID, vendor_attributes])
  }
  return marshalled
}

function accounting_respond(decoded, rinfo, attributes, vendor_attributes, on_responded) {
  this.respond(
    'acct',
    decoded,
    'Accounting-Response',
    rinfo,
    attributes,
    vendor_attributes,
    on_responded
  )
}

function access_reject(decoded, rinfo, attributes, vendor_attributes, on_rejected) {
  this.respond(
    'auth',
    decoded,
    'Access-Reject',
    rinfo,
    attributes,
    vendor_attributes,
    on_rejected || function() {}
  )
}

function access_accept(decoded, rinfo, attributes, vendor_attributes, on_accepted) {
  this.respond(
    'auth',
    decoded,
    'Access-Accept',
    rinfo,
    attributes,
    vendor_attributes,
    on_accepted || function() {}
  )
}

var EventEmitter = require('events')
var dgram = require('dgram')

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

    this.RADIUS = require('radius')
    this.SHARED_SECRET = SHARED_SECRET
    this.AUTH_PORT = AUTH_PORT
    this.ACCT_PORT = ACCT_PORT
    this.COA_PORT = COA_PORT

    // we have to check these again because they are optional
    if (VENDOR_DICTIONARY_PATH && VENDOR_ID) {
      this.RADIUS.add_dictionary(VENDOR_DICTIONARY_PATH)
      this.VENDOR_ID = VENDOR_ID
    }

    this.SOCKETS = {
      AUTH: dgram.createSocket('udp4', function(message, rinfo) {
        var decoded = decode.call(this, message, this.emit.bind(this, 'error#decode#auth'))
        if (!decoded) return
        this.emit(
          decoded.code,
          decoded,
          rinfo,
          access_accept.bind(this, decoded, rinfo),
          access_reject.bind(this, decoded, rinfo)
        )
      }.bind(this)),
      ACCT: dgram.createSocket('udp4', function(message, rinfo) {
        var decoded = decode.call(this, message, this.emit.bind(this, 'error#decode#acct'))
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
          `${decoded.code}-${decoded.attributes['Acct-Status-Type']}`,
          decoded,
          rinfo,
          accounting_respond.bind(this, decoded, rinfo)
        )
      }.bind(this)),
      COA: dgram.createSocket('udp4', function(message, rinfo) {
        var decoded = decode.call(this, message, this.emit.bind(this, 'error#decode#coa'))
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
    try {
      var encoded = this.RADIUS.encode({
        attributes: marshall_attributes.call(this, attributes, vendor_attributes),
        secret: this.SHARED_SECRET,
        code: code
      })
    } catch (err) {
      on_sent(err)
      return
    }
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
    try {
      var encoded = this.RADIUS.encode_response({
        packet: packet,
        code: code,
        attributes: marshall_attributes.call(this, attributes, vendor_attributes),
        secret: this.SHARED_SECRET
      })
    } catch (err) {
      on_responded(err)
      return
    }
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
