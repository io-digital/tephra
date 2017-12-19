
var radius = require('radius')

var marshall_attributes = require('./marshall_attributes')

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
      attributes: marshall_attributes.call(this, attributes, vendor_attributes),
      secret: this.SHARED_SECRET
    })
  } catch (err) {
    on_error(err)
    return
  }
  return encoded
}
