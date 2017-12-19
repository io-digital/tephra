
module.exports = function access_reject(
  decoded,
  rinfo,
  attributes,
  vendor_attributes,
  on_rejected
) {
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
