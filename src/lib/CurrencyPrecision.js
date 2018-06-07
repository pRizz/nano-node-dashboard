const decimals = {
  BTC: 8,
  NANO: 6,
  USD: 6,
  VEF: 2,
  default: 6
};

export default function precision(cur) {
  return decimals[cur.toUpperCase()] || decimals.default;
}
