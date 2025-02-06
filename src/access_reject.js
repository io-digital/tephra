
export default function access_reject(
  decoded,
  remote_host,
  attributes,
  vendor_attributes,
  on_rejected
) {
  this.respond(
    'authentication',
    decoded,
    'Access-Reject',
    remote_host,
    attributes,
    vendor_attributes,
    on_rejected
  )
}
