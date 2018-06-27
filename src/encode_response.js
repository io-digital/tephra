
var radius = require('radius')

var node_radius_shim = require('./node_radius_shim')

module.exports = function encode_response(
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
      secret: this.SHARED_SECRET
    })
  } catch (err) {
    on_error(err)
    return
  }
  return encoded
}
