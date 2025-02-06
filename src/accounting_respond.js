
export default function accounting_respond(
  decoded,
  rinfo,
  attributes,
  vendor_attributes,
  on_responded
) {
  this.respond(
    'acct',
    decoded,
    'Accounting-Response',
    rinfo,
    attributes,
    vendor_attributes,
    on_responded || function() {}
  )
}
