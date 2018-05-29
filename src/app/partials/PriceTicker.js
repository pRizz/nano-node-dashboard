import React from "react";
import accounting from "accounting";
import injectClient from "../../lib/ClientComponent";

class PriceTicker extends React.PureComponent {
  render() {
    const { ticker } = this.props;
    if (!ticker) return null;

    return (
      <p className="text-sm-center my-0 mr-3">
        1 BAN = {accounting.formatMoney(ticker.price_usd, "$", 6)}
        <br />
        1 NANO = {accounting.formatNumber(1 / ticker.price_nano, 0)} BAN
      </p>
    );
  }

  getChangeSymbol() {
    const { ticker } = this.props;
    const percentChange = parseFloat(ticker.percent_change_1h, 10);
    return percentChange >= 0 ? "arrow-up" : "arrow-down";
  }
}

export default injectClient(PriceTicker);
