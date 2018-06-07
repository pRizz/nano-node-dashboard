import React from "react";
import accounting from "accounting";
import injectClient from "../../lib/ClientComponent";
import currencyPrecision from "../../lib/CurrencyPrecision";

class PriceWithConversions extends React.PureComponent {
  static defaultProps = {
    nano: true,
    precision: {}
  };

  getPrecisionForCurrency(cur) {
    return this.props.precision[cur] || currencyPrecision(cur);
  }

  getValueForCurrency(cur) {
    const { amount, ticker } = this.props;
    if (!ticker) return 0;

    switch (cur) {
      case "banano":
        return amount;
      default:
        const _cur = cur.toUpperCase();
        if (!ticker[_cur])
          return new Error(`${cur} is not currently supported`);
        return amount * parseFloat(ticker[_cur].price, 10);
    }
  }

  getDisplayValueForCurrency(cur) {
    const value = this.getValueForCurrency(cur);

    switch (cur) {
      case "banano":
        return `${accounting.formatNumber(
          value,
          this.getPrecisionForCurrency("banano")
        )} BAN`;
      case "nano":
        return `${accounting.formatNumber(
          value,
          this.getPrecisionForCurrency("nano")
        )} NANO`;
      case "usd":
        return accounting.formatMoney(
          value,
          "$",
          this.getPrecisionForCurrency("usd")
        );
      case "btc":
        return accounting.formatMoney(
          value,
          "₿",
          this.getPrecisionForCurrency("btc")
        );
      default:
        return accounting.formatMoney(value, {
          symbol: cur.toUpperCase(),
          format: "%v %s",
          precision: this.getPrecisionForCurrency(cur)
        });
    }
  }

  getConvertedValues() {
    const { currencies, ticker } = this.props;
    if (!ticker) return null;

    let conversions = currencies.map(cur =>
      this.getDisplayValueForCurrency(cur)
    );
    return conversions.join(" / ");
  }

  render() {
    const { currencies } = this.props;

    if (this.props.children) {
      return this.props.children(
        ...currencies.map(cur => this.getDisplayValueForCurrency(cur))
      );
    } else {
      return this.getConvertedValues();
    }
  }
}

export default injectClient(PriceWithConversions);
