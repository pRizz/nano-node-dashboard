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
        USD: { price: 0 },
        BTC: { price: 0 },
        NANO: { price: 0 }
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
    return data.quotes;
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
