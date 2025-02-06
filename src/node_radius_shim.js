
export default function node_radius_shim(
  attributes,
  vendor_attributes
) {
  var shimmed = []

  if (Array.isArray(attributes) && attributes.length) {
    shimmed = shimmed.concat(attributes)
  }

  Object.keys(
    vendor_attributes
  ).forEach(function(vendor_name) {
    shimmed.push([
      'Vendor-Specific',
      this.vendor_ids[vendor_name],
      vendor_attributes[vendor_name]
    ])
  }, this)

  return shimmed
}
