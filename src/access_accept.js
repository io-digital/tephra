
module.exports = function access_accept(
  decoded,
  rinfo,
  attributes,
  vendor_attributes,
  on_accepted
) {
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
