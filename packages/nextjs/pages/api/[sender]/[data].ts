import { abi as Resolver_abi } from "@ensdomains/ens-contracts/artifacts/contracts/resolvers/Resolver.sol/Resolver.json";
import { abi as IResolverService_abi } from "@ensdomains/offchain-resolver-contracts/artifacts/contracts/OffchainResolver.sol/IResolverService.json";
import { Fragment, Interface, JsonFragment } from "@ethersproject/abi";
import { hexlify } from "@ethersproject/bytes";
import { kv } from "@vercel/kv";
import { BytesLike, ethers } from "ethers";
import { Result, hexConcat } from "ethers/lib/utils";
import { NextApiRequest, NextApiResponse } from "next";
import { ENSRedisDatabase } from "~~/utils/ensRedis";

const Resolver = new ethers.utils.Interface(Resolver_abi);
const ETH_COIN_TYPE = 60;

interface DatabaseResult {
  result: any[];
  ttl: number;
}

type PromiseOrResult<T> = T | Promise<T>;

export interface Database {
  addr(name: string, coinType: number): PromiseOrResult<{ addr: string; ttl: number }>;
  text(name: string, key: string): PromiseOrResult<{ value: string; ttl: number }>;
  contenthash(name: string): PromiseOrResult<{ contenthash: string; ttl: number }>;
}

function decodeDnsName(dnsname: Buffer) {
  const labels = [];
  let idx = 0;
  while (true) {
    const len = dnsname.readUInt8(idx);
    if (len === 0) break;
    labels.push(dnsname.slice(idx + 1, idx + len + 1).toString("utf8"));
    idx += len + 1;
  }
  return labels.join(".");
}

const queryHandlers: {
  [key: string]: (db: Database, name: string, args: Result) => Promise<DatabaseResult>;
} = {
  "addr(bytes32)": async (db, name, _args) => {
    const { addr, ttl } = await db.addr(name, ETH_COIN_TYPE);
    return { result: [addr], ttl };
  },
  "addr(bytes32,uint256)": async (db, name, args) => {
    const { addr, ttl } = await db.addr(name, args[0]);
    return { result: [addr], ttl };
  },
  "text(bytes32,string)": async (db, name, args) => {
    const { value, ttl } = await db.text(name, args[0]);
    return { result: [value], ttl };
  },
  "contenthash(bytes32)": async (db, name, _args) => {
    const { contenthash, ttl } = await db.contenthash(name);
    return { result: [contenthash], ttl };
  },
};

async function query(db: Database, name: string, data: string): Promise<{ result: BytesLike; validUntil: number }> {
  // Parse the data nested inside the second argument to `resolve`
  const { signature, args } = Resolver.parseTransaction({ data });

  if (ethers.utils.nameprep(name) !== name) {
    throw new Error("Name must be normalised");
  }

  if (ethers.utils.namehash(name) !== args[0]) {
    throw new Error("Name does not match namehash");
  }

  const handler = queryHandlers[signature];
  if (handler === undefined) {
    throw new Error(`Unsupported query function ${signature}`);
  }

  const { result, ttl } = await handler(db, name, args.slice(1));
  return {
    result: Resolver.encodeFunctionResult(signature, result),
    validUntil: Math.floor(Date.now() / 1000 + ttl),
  };
}

function toInterface(abi: string | readonly (string | Fragment | JsonFragment)[] | Interface) {
  if (Interface.isInterface(abi)) {
    return abi;
  }
  return new Interface(abi);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sender, data } = req.query;

  console.log(`Sender: ${sender}`);
  console.log(`Data: ${data}`);

  const calldata = hexlify(data);
  console.log(`Calldata: ${calldata}`);

  const selector = calldata.slice(0, 10).toLowerCase();

  console.log(`Selector: ${selector}`);

  const handleType = "resolve";

  const abiInterface = toInterface(IResolverService_abi);
  const fn = abiInterface.getFunction(handleType);

  console.log(`Function: ${fn}`);
  console.log(`Function inputs: ${fn.inputs}`);
  console.log(`Function outputs: ${fn.outputs}`);

  const args = ethers.utils.defaultAbiCoder.decode(fn.inputs, "0x" + calldata.slice(10));

  console.log(`Args: ${args}`);

  const encodedName = args[0];
  const name = decodeDnsName(Buffer.from(encodedName.slice(2), "hex"));

  console.log(`Name: ${name}`);

  const encodedData = args[1];

  const db = new ENSRedisDatabase(300);
  const { result, validUntil } = await query(db, name, encodedData);
  console.log("result", result);

  const to = "0x8464135c8F25Da09e49BC8782676a84730C318bC";

  // Hash and sign the response
  let messageHash = ethers.utils.solidityKeccak256(
    ["bytes", "address", "uint64", "bytes32", "bytes32"],
    ["0x1900", to, validUntil, ethers.utils.keccak256(data || "0x"), ethers.utils.keccak256(result)],
  );
  console.log("messageHash", messageHash);
  const privateKey = "0xc99d1fec66736e414a9a0e5b9771bc12eb0214552944dda994a8e5dfece9cdf1";
  const signer = new ethers.utils.SigningKey(privateKey);
  const sig = signer.signDigest(messageHash);
  const sigData = hexConcat([sig.r, sig.s, new Uint8Array([sig.v])])
  console.log("validUntil", validUntil);
  console.log("sigData", sigData);

  const fullResult = [result, validUntil, sigData];

  const fullResultHex = hexlify(ethers.utils.defaultAbiCoder.encode(fn.outputs, fullResult));

  res.status(200).json({ data: fullResultHex });
}
