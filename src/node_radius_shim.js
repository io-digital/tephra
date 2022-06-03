
module.exports = function node_radius_shim(
  attributes,
  vendor_attributes
) {
  var shimmed = []
  if (Array.isArray(attributes) && attributes.length) {
    shimmed = shimmed.concat(attributes)
  }
  Object.keys(
    vendor_attributes
  ).forEach(vendor_name => {

    Object.keys(
      vendor_attributes[vendor_name]
    ).forEach(attr => {
      shimmed.push([
        'Vendor-Specific',
        this.VENDOR_IDS[vendor_name],
        [[attr, vendor_attributes[vendor_name][attr]]]
      ])
    })

  })
  return shimmed
}
