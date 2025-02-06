
import {EventEmitter} from 'events'
import dgram from 'dgram'

var radius = (await import('radius')).default

import send from './send.js'
import encode_request from './encode_request.js'
import encode_response from './encode_response.js'
import authentication_on_message from './authentication_on_message.js'
import accounting_on_message from './accounting_on_message.js'
import change_of_authorisation_on_message from './change_of_authorisation_on_message.js'

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

    var sockets = [
      {
        name: 'authentication',
        port: authentication_port,
        key: 'authentication',
        callback: authentication_on_message
      },
      {
        name: 'accounting',
        port: accounting_port,
        key: 'accounting',
        callback: accounting_on_message
      },
      {
        name: 'change of authorisation',
        port: change_of_authorisation_port,
        key: 'change_of_authorisation',
        callback: change_of_authorisation_on_message
      }
    ]

    this.sockets = {}

    sockets.forEach(function(socket) {
      var {name, port, key, callback} = socket

      if (!port) return

      if (!validate_port(port)) {
        throw new Error(`Invalid port specified for ${name} socket`)
      }

      this[key] = port
      this.sockets[key] = dgram.createSocket('udp4', callback.bind(this))
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
    socket,
    code,
    remote_host,
    attributes,
    vendor_attributes,
    on_sent
  ) {
    if (!(socket in this.sockets)) {
      throw new Error(`Invalid socket given: ${socket}`)
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
      this.sockets[socket],
      encoded,
      remote_host,
      on_sent
    )
  }

  respond(
    socket,
    packet,
    code,
    remote_host,
    attributes,
    vendor_attributes,
    on_responded
  ) {
    if (!(socket in this.sockets)) {
      throw new Error(`Invalid socket given: ${socket}`)
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
      this.sockets[socket],
      encoded,
      remote_host,
      on_responded
    )
  }

  disconnect(
    remote_host,
    attributes,
    vendor_attributes,
    on_sent
  ) {
    this.send(
      // just send from the first available socket
      this[Object.keys(this.sockets)[0]],
      'Disconnect-Request',
      remote_host,
      attributes,
      vendor_attributes,
      on_sent
    )
  }
}
