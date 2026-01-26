/**
 * Pricing utilities for customer-specific prices
 */
export const normalizeCustomerType = (customerType) => {
  const value = (customerType || '').toString().toLowerCase().trim();
  if (value === 'wholesale' || value === 'ulgurji') {
    return 'wholesale';
  }
  if (value === 'retail' || value === 'dona') {
    return 'retail';
  }
  return 'regular';
};

const toNumber = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getProductPrice = (product, customerType) => {
  const type = normalizeCustomerType(customerType);
  const wholesale = toNumber(product?.wholesale_price);
  const retail = toNumber(product?.retail_price);
  const regular = toNumber(product?.regular_price);

  if (type === 'wholesale') {
    return wholesale || retail || regular || 0;
  }
  if (type === 'retail') {
    return retail || regular || wholesale || 0;
  }
  return regular || retail || wholesale || 0;
};
