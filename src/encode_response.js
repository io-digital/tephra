
var radius = (await import('radius')).default

import node_radius_shim from './node_radius_shim.js'

export default function encode_response(
  packet,
  code,
  attributes,
  vendor_attributes,
  on_error
) {
  try {
    var encoded = radius.encode_response({
      packet: packet,
      code: code,
      attributes: node_radius_shim.call(this, attributes, vendor_attributes),
      secret: this.shared_secret
    })
  } catch (err) {
    on_error(err)
    return
  }

  return encoded
}
