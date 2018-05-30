import fetch from "node-fetch";
import moment from "moment";
import _ from "lodash";
import redisFetch from "../helpers/redisFetch";

const CIRCULATING_SUPPLY = 3402823669.2;

export default function(app, nano) {
  app.get("/ticker", async (req, res) => {
    try {
      const data = await redisFetch("ticker", 300, async () => {
        return await fetchTickerData();
      });

      res.json({ data });
    } catch (e) {
      res.status(500).send({ error: e.message });
    }
  });
}

async function fetchTickerData() {
  const nanoData = await fetchNanoData();
  const bananoData = await fetchBananoData();

  const nanoStats = getNanoStats(bananoData);
  const usdStats = getUSDStats(nanoData, nanoStats);
  const btcStats = getBTCStats(nanoData, nanoStats);

  return {
    name: "Banano",
    symbol: "BAN",
    circulating_supply: CIRCULATING_SUPPLY,
    total_supply: CIRCULATING_SUPPLY,
    max_supply: CIRCULATING_SUPPLY,
    quotes: {
      USD: usdStats,
      NANO: nanoStats,
      BTC: btcStats
    },
    last_updated: new Date().getTime() / 1000
  };
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

function getNanoStats(bananoData) {
  const exchangeRates = bananoData.map((trade, i) => ({
    rate: trade.nano / 1000000.0 / trade.banano,
    order: i
  }));

  const rates = filterOutliers(exchangeRates)
    .slice(0, 5)
    .map(r => r.rate);

  const avgRate = _.sum(rates) / rates.length;
  const volume24h = _.sum(bananoData.map(trade => trade.nano / 1000000.0));

  return {
    price: avgRate,
    volume_24h: volume24h,
    market_cap: CIRCULATING_SUPPLY * avgRate
  };
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
      1 /
      2 *
      (values[values.length / 4].rate + values[values.length / 4 + 1].rate);
    q3 =
      1 /
      2 *
      (values[values.length * (3 / 4)].rate +
        values[values.length * (3 / 4) + 1].rate);
  } else {
    q1 = values[Math.floor(values.length / 4 + 1)].rate;
    q3 = values[Math.ceil(values.length * (3 / 4) + 1)].rate;
  }

  iqr = q3 - q1;
  maxValue = q3 + iqr * 1.5;
  minValue = q1 - iqr * 1.5;

  return values
    .filter(x => x.rate >= minValue && x.rate <= maxValue)
    .sort((a, b) => a.order - b.order);
}
