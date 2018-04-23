import { Nano } from "nanode";
import config from "../../server-config.json";

const nano = new Nano({ url: config.nodeHost });

export function accountIsValid(account) {
  return /^ban_/.test(account);
}

export function processBlock(block) {
  block.amount = nano.convert.fromRaw(block.amount, "mrai") * 10;
  block.contents = JSON.parse(block.contents);

  switch (block.contents.type) {
    case "send":
      block.contents.balance =
        nano.convert.fromRaw(
          parseInt(block.contents.balance, 16).toString(),
          "mrai"
        ) * 10;
      break;
    case "state":
      block.contents.balance =
        nano.convert.fromRaw(block.contents.balance, "mrai") * 10;
      break;
  }

  return block;
}
