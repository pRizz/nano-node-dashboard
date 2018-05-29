import React from "react";
import ConfigContext from "./ConfigContext";

export default class ConfigProvider extends React.Component {
  state = { config: null };

  async componentDidMount() {
    const resp = await fetch("/client-config.json");
    let config = await resp.json();

    try {
      config.ticker = await this.fetchTicker(config);
    } catch (e) {
      config.ticker = {
        price_usd: 0,
        price_btc: 0,
        price_nano: 0,
        percent_change_1h: 0,
        percent_change_24h: 0
      };
    }

    this.setState({ config }, () =>
      setTimeout(this.updateTicker.bind(this), 300000)
    );
  }

  async updateTicker() {
    let { config } = this.state;
    config.ticker = await this.fetchTicker();
    this.setState({ config });

    setTimeout(this.updateTicker.bind(this), 300000);
  }

  async fetchTicker(config) {
    const resp = await fetch(`${config.server}/ticker`, {
      mode: "cors"
    });

    const data = (await resp.json()).data;
    return {
      price_usd: data.quotes.USD.price,
      price_btc: data.quotes.BTC.price,
      price_nano: data.quotes.NANO.price,
      percent_change_1h: 0,
      percent_change_24h: 0
    };
  }

  render() {
    const { config } = this.state;

    return (
      <ConfigContext.Provider value={config}>
        {this.props.children}
      </ConfigContext.Provider>
    );
  }
}
