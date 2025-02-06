
import {EventEmitter} from 'events'
import dgram from 'dgram'

var radius = (await import('radius')).default

import send from './send.js'
import encode_request from './encode_request.js'
import encode_response from './encode_response.js'
import auth_on_message from './auth_on_message.js'
import acct_on_message from './acct_on_message.js'
import coa_on_message from './coa_on_message.js'

function validate_vendor_dictionary(vendor_dictionary) {
  return (
    typeof vendor_dictionary.name === 'string' &&
    vendor_dictionary.name.length &&
    typeof vendor_dictionary.path === 'string' &&
    vendor_dictionary.path.length &&
    !isNaN(vendor_dictionary.id) &&
    Number.isInteger(vendor_dictionary.id) &&
    vendor_dictionary.id
  )
}

function validate_port(port) {
  return (
    !isNaN(port) &&
    Number.isInteger(port) &&
    port >= 0 &&
    port <= 65535
  )
}

export default class extends EventEmitter {

  constructor(
    options = {
      secret: '',
      shared_secret: '',
      sharedSecret: '',
      ports: {
        auth: false,
        authentication: false,
        acct: false,
        accounting: false,
        coa: false,
        change_of_authorisation: false,
        changeOfAuthorisation: false,
        changeOfAuthorization: false
      },
      vendor_dictionaries: null,
      vendorDictionaries: null
    }
  ) {
    super()

    var secret = (options.secret || options.secret || options.sharedSecret)

    if (!secret) {
      throw new Error('Missing shared secret')
    }

    this.secret = secret

    var vendor_dictionaries = (options.vendor_dictionaries || options.vendorDictionaries)

    this.vendor_ids = {}

    if (vendor_dictionaries && Array.isArray(vendor_dictionaries)) {
      vendor_dictionaries.forEach(function(vendor_dictionary, idx) {
        if (!validate_vendor_dictionary(vendor_dictionary)) {
          throw new Error(
            `Vendor dictionary at index ${idx} is malformed. Expected {name: String, path: String, id: Number} but got ${JSON.stringify(vendor_dictionary)}`
          )
        }

        radius.add_dictionary(vendor_dictionary.path)
        this.vendor_ids[vendor_dictionary.name] = vendor_dictionary.id
      }, this)
    }

    if (!options.ports) {
      throw new Error('At least one port is required')
    }

    var authentication_port = +(options.ports.auth || options.ports.authentication)
    var accounting_port = +(options.ports.acct || options.ports.accounting)
    var change_of_authorisation_port = +(
      options.ports.coa ||
      options.ports.change_of_authorisation ||
      options.ports.changeOfAuthorisation ||
      options.ports.changeOfAuthorization
    )

    if (!(authentication_port || accounting_port || change_of_authorisation_port)) {
      throw new Error('At least one port is required')
    }

    this.sockets = {}

    void [
      {name: 'authentication', value: authentication_port, socket: 'authentication', callback: auth_on_message},
      {name: 'accounting', value: accounting_port, socket: 'accounting', callback: acct_on_message},
      {name: 'change of authorisation', value: change_of_authorisation_port, socket: 'change_of_authorisation', callback: coa_on_message}
    ].forEach(function(port) {
      var {name, value, socket, callback} = port

      if (!value) return

      if (!validate_port(value)) {
        throw new Error(`Invalid port specified for ${name} socket`)
      }

      this[socket] = value
      this.sockets[socket] = dgram.createSocket('udp4', callback.bind(this))
    }, this)
  }

  bind(on_bound) {
    Object.keys(
      this.sockets
    ).forEach(function(socket) {
      this.sockets[socket].bind(this[socket])
    }, this)

    return typeof on_bound === 'function' ? on_bound() : this
  }

  unbind(on_unbound) {
    Object.keys(
      this.sockets
    ).forEach(function(socket) {
      this.sockets[socket].close()
    }, this)

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
      this.sockets[type.toLowerCase()],
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
      this.sockets[type.toLowerCase()],
      encoded,
      rinfo,
      on_responded
    )
  }

  disconnect(
    rinfo,
    attributes = [],
    vendor_attributes = {},
    on_sent
  ) {
    rinfo.port = this.change_of_authorisation

    this.send(
      'change_of_authorisation',
      'Disconnect-Request',
      rinfo,
      attributes,
      vendor_attributes,
      on_sent
    )
  }
}
