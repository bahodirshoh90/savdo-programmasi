/**
 * Pricing helpers for customer app
 */
export const normalizeCustomerType = (customerType) => {
  if (!customerType) return null;
  if (typeof customerType === 'string') {
    return customerType.trim().toLowerCase();
  }
  if (typeof customerType === 'object' && customerType.value) {
    return String(customerType.value).trim().toLowerCase();
  }
  return String(customerType).trim().toLowerCase();
};

export const getProductPrice = (product, customerType) => {
  if (!product) return 0;
  const type = normalizeCustomerType(customerType);
  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  if (type === 'wholesale' && product.wholesale_price != null) {
    return toNumber(product.wholesale_price);
  }
  if (type === 'retail' && product.retail_price != null) {
    return toNumber(product.retail_price);
  }
  if (type === 'regular' && product.regular_price != null) {
    return toNumber(product.regular_price);
  }

  return toNumber(
    product.retail_price ??
      product.regular_price ??
      product.wholesale_price ??
      0
  );
};
