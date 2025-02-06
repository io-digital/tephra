
export default function accounting_respond(
  decoded,
  remote_host,
  attributes,
  vendor_attributes,
  on_responded
) {
  this.respond(
    'accounting',
    decoded,
    'Accounting-Response',
    remote_host,
    attributes,
    vendor_attributes,
    on_responded
  )
}
