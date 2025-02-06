
export default function access_accept(
  decoded,
  remote_host,
  attributes,
  vendor_attributes,
  on_accepted
) {
  this.respond(
    'authentication',
    decoded,
    'Access-Accept',
    remote_host,
    attributes,
    vendor_attributes,
    on_accepted
  )
}
