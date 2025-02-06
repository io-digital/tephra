
export default function access_accept(
  decoded,
  rinfo,
  attributes,
  vendor_attributes,
  on_accepted
) {
  this.respond(
    'authentication',
    decoded,
    'Access-Accept',
    rinfo,
    attributes,
    vendor_attributes,
    on_accepted || function() {}
  )
}
