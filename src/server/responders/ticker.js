import fetch from "node-fetch";
import moment from "moment";
import _ from "lodash";
import redisFetch from "../helpers/redisFetch";
import config from "../../../server-config.json";

const CIRCULATING_SUPPLY = 3402823669.2;

export default function(app, nano) {
  app.get("/ticker", async (req, res) => {
    try {
      const fiatRates = req.query.cur
        ? req.query.cur.split(",").map(cur => cur.toUpperCase())
        : [];
      const cacheKey = `ticker/${fiatRates.sort().join(":")}`;
      const data = await redisFetch(cacheKey, 60, async () => {
        return await fetchTickerData(fiatRates);
      });

      res.json({ data });
    } catch (e) {
      res.status(500).send({ error: e.message, stack: e.stack });
    }
  });
}

async function fetchTickerData(fiatRates) {
  const exchangeRates = await fetchExchangeRates();
  const nanoData = await fetchNanoData();
  const bananoData = await fetchBananoData();

  const nanoStats = await getNanoStats(bananoData);
  const btcStats = getBTCStats(nanoData, nanoStats);

  const fiatStats = getFiatStats(fiatRates, exchangeRates, nanoData, nanoStats);

  return {
    name: "Banano",
    symbol: "BAN",
    circulating_supply: CIRCULATING_SUPPLY,
    total_supply: CIRCULATING_SUPPLY,
    max_supply: CIRCULATING_SUPPLY,
    quotes: _.merge(
      {
        NANO: nanoStats,
        BTC: btcStats
      },
      fiatStats
    ),
    last_updated: new Date().getTime() / 1000
  };
}

async function fetchExchangeRates() {
  // Update every 2 hours right now, to avoid going over free limits
  return await redisFetch("fiat_exchange_rates", 7200, async () => {
    const resp = await fetch(
      `http://openexchangerates.org/api/latest.json?app_id=${
        config.openExchangeRatesAppId
      }`
    );
    if (resp.ok) {
      return (await resp.json()).rates;
    }

    return {};
  });
}

async function fetchNanoData() {
  const resp = await fetch(
    "https://api.coinmarketcap.com/v2/ticker/1567/?convert=BTC"
  );
  return (await resp.json()).data;
}

async function fetchBananoData() {
  const start = moment()
    .subtract(1, "day")
    .toISOString()
    .match(/(.+)\.\d+Z$/)[1];
  const end = moment()
    .toISOString()
    .match(/(.+)\.\d+Z$/)[1];

  const resp = await fetch(
    `http://bbdevelopment.website:8000/trade?start=${start}&end=${end}`
  );
  return (await resp.json()).data;
}

async function getNanoStats(bananoData) {
  let volume24h;
  if (bananoData.length === 0) {
    const resp = await fetch(
      `http://bbdevelopment.website:8000/trade?limit=20`
    );
    bananoData = (await resp.json()).data;
    volume24h = 0;
  } else {
    volume24h = _.sum(bananoData.map(trade => trade.nano / 1000000.0));
  }

  // const exchangeRates = bananoData.map((trade, i) => ({
  //   rate: trade.nano / 1000000.0 / trade.banano,
  //   order: i
  // }));

  // const rates = filterOutliers(exchangeRates)
  //   .slice(0, 5)
  //   .map(r => r.rate);

  const rates = bananoData.slice(0, 5);
  const volume = rates.reduce((acc, trade) => acc + trade.banano, 0);
  const weights = rates.map(trade => trade.banano / volume);
  const weightedRates = rates.map(
    (trade, i) => (trade.nano / 1000000.0 / trade.banano) * weights[i]
  );

  const avgRate = weightedRates.reduce((acc, rate) => acc + rate, 0);

  return {
    price: avgRate,
    volume_24h: volume24h,
    market_cap: CIRCULATING_SUPPLY * avgRate
  };
}

function getFiatStats(fiatRates, exchangeRates, nanoData, nanoStats) {
  if (fiatRates.length === 0) fiatRates = _.keys(exchangeRates);
  return _.fromPairs(
    _.compact(
      fiatRates.map(cur => {
        if (!exchangeRates[cur]) return null;

        // USD is our base currency, so we multiply Nano's USD price by what we're converting to.
        const price =
          nanoData.quotes.USD.price * exchangeRates[cur] * nanoStats.price;
        return [
          cur,
          {
            price,
            volume_24h: nanoStats.volume_24h * price,
            market_cap: CIRCULATING_SUPPLY * price
          }
        ];
      })
    )
  );
}

function getUSDStats(nanoData, nanoStats) {
  const price = nanoData.quotes.USD.price * nanoStats.price;
  return {
    price,
    volume_24h: nanoStats.volume_24h * price,
    market_cap: CIRCULATING_SUPPLY * price
  };
}

function getBTCStats(nanoData, nanoStats) {
  const price = nanoData.quotes.BTC.price * nanoStats.price;
  return {
    price,
    volume_24h: nanoStats.volume_24h * price,
    market_cap: CIRCULATING_SUPPLY * price
  };
}

function filterOutliers(someArray) {
  if (someArray.length < 4) return someArray;

  let values, q1, q3, iqr, maxValue, minValue;

  values = someArray.slice().sort((a, b) => a.rate - b.rate); //copy array fast and sort

  if ((values.length / 4) % 1 === 0) {
    //find quartiles
    q1 =
      (1 / 2) *
      (values[values.length / 4].rate + values[values.length / 4 + 1].rate);
    q3 =
      (1 / 2) *
      (values[values.length * (3 / 4) - 1].rate +
        values[values.length * (3 / 4)].rate);
  } else {
    q1 = values[Math.floor(values.length / 4)].rate;
    q3 = values[Math.ceil(values.length * (3 / 4))].rate;
  }

  iqr = q3 - q1;
  maxValue = q3 + iqr * 1.5;
  minValue = q1 - iqr * 1.5;

  return values
    .filter(x => x.rate >= minValue && x.rate <= maxValue)
    .sort((a, b) => a.order - b.order);
}
