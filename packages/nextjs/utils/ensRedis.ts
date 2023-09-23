import { kv } from "@vercel/kv";

type PromiseOrResult<T> = T | Promise<T>;

interface Database {
  addr(name: string, coinType: number): PromiseOrResult<{ addr: string; ttl: number }>;
  text(name: string, key: string): PromiseOrResult<{ value: string; ttl: number }>;
  contenthash(name: string): PromiseOrResult<{ contenthash: string; ttl: number }>;
}

interface NameData {
  addresses?: { [coinType: number]: string };
  text?: { [key: string]: string };
  contenthash?: string;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EMPTY_CONTENT_HASH = "0x";

export class ENSRedisDatabase implements Database {
  ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  async addr(name: string, coinType: number) {
    const addressesData = await kv.hget("ens:" + name, "addresses");
    if (!addressesData || !addressesData[coinType]) {
      return { addr: ZERO_ADDRESS, ttl: this.ttl };
    }
    return { addr: addressesData[coinType], ttl: this.ttl };
  }

  async text(name: string, key: string) {
    const textData = await kv.hget("ens:" + name, "text");
    if (!textData || !textData[key]) {
      return { value: "", ttl: this.ttl };
    }
    return { value: textData[key], ttl: this.ttl };
  }

  async contenthash(name: string) {
    const contentData = await kv.hget("ens:" + name, "contenthash");
    if (!contentData) {
      return { contenthash: EMPTY_CONTENT_HASH, ttl: this.ttl };
    }
    return { contenthash: contentData, ttl: this.ttl };
  }
}
