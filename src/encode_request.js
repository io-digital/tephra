
var radius = require('radius')

var marshall_attributes = require('./marshall_attributes')

module.exports = function encode_request(
  code,
  attributes,
  vendor_attributes,
  on_error
) {
  try {
    var encoded = radius.encode({
      attributes: marshall_attributes.call(this, attributes, vendor_attributes),
      secret: this.SHARED_SECRET,
      code: code
    })
  } catch (err) {
    on_error(err)
    return
  }
  return encoded
}
