
// var radius = require('radius')
var radius = (await import('radius')).default

// var node_radius_shim = require('./node_radius_shim')
import node_radius_shim from './node_radius_shim.js'

export default function encode_request(
  code,
  attributes,
  vendor_attributes,
  on_error
) {
  try {
    var encoded = radius.encode({
      attributes: node_radius_shim.call(this, attributes, vendor_attributes),
      secret: this.SHARED_SECRET,
      code: code
    })
  } catch (err) {
    on_error(err)
    return
  }
  return encoded
}
