import React from "react";
import _ from "lodash";
import { Helmet } from "react-helmet";
import accounting from "accounting";
import injectClient from "../../lib/ClientComponent";
import currencyPrecision from "../../lib/CurrencyPrecision";

const cryptoCurrencies = ["BTC", "NANO"];

function ExchangeRates({ config }) {
  return (
    <div className="row my-5 mx-0 justify-content-center">
      <Helmet>
        <title>Banano Exchange Rates</title>
      </Helmet>

      <div className="col-12 col-lg-5">
        <h1 className="display-1">1 BAN =</h1>
        <p className="text-muted">
          Disclaimer<br />
          <small>
            These exchange rates are calculated as an average of the last 5 OTC
            trades in the Banano Discord server, minus obvious outliers. They
            may not be 100% accurate and can be manipulated.
          </small>
        </p>
      </div>
      <div className="col-12 col-lg-5">
        {getHighlightedCurrencies(config)}
        <hr />
        {getOtherCurrencies(config)}
      </div>
    </div>
  );
}

function getHighlightedCurrencies(config) {
  const { ticker, fiatCurrencies } = config;

  return cryptoCurrencies.concat(fiatCurrencies).map(cur => (
    <h1 key={cur}>
      {accounting.formatMoney(ticker[cur].price, {
        symbol: cur,
        format: "%v %s",
        precision: currencyPrecision(cur)
      })}
    </h1>
  ));
}

function getOtherCurrencies(config) {
  const { ticker, fiatCurrencies } = config;

  const otherCurrencies = _.fromPairs(
    _.filter(
      _.toPairs(ticker),
      d => !fiatCurrencies.includes(d[0]) && !cryptoCurrencies.includes(d[0])
    )
  );

  return _.map(otherCurrencies, (data, cur) => (
    <h3 key={cur}>
      {accounting.formatMoney(data.price, {
        symbol: cur,
        format: "%v %s",
        precision: currencyPrecision(cur)
      })}
    </h3>
  ));
}

function precisionForCurrency(cur) {}

export default injectClient(ExchangeRates);
