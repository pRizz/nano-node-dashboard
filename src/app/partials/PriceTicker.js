import React, { Fragment } from "react";
import { Link } from "react-router-dom";
import accounting from "accounting";
import injectClient from "../../lib/ClientComponent";

class PriceTicker extends React.PureComponent {
  render() {
    const { ticker } = this.props;
    if (!ticker) return null;

    return (
      <p className="text-sm-center my-0 mr-3">
        <Link to="/explorer/exchange_rates" className="text-dark">
          1 BAN = {accounting.formatMoney(ticker.USD.price, "$", 6)}
          <br />
          1 NANO = {accounting.formatNumber(1 / ticker.NANO.price, 0)} BAN
        </Link>
      </p>
    );
  }

  getFiatConversions() {
    const { config, ticker } = this.props;
    return config.fiatCurrencies
      .map(cur =>
        accounting.formatMoney(ticker[cur].price, {
          symbol: cur,
          format: "%v %s",
          precision: 6
        })
      )
      .join(", ");
  }

  getChangeSymbol() {
    const { ticker } = this.props;
    const percentChange = parseFloat(ticker.percent_change_1h, 10);
    return percentChange >= 0 ? "arrow-up" : "arrow-down";
  }
}

export default injectClient(PriceTicker);
