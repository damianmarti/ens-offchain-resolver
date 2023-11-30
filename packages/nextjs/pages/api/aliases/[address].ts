import { kv } from "@vercel/kv";
import { verifyMessage } from "viem";
import { NextApiRequest, NextApiResponse } from "next";

type ReqBody = {
  signature: `0x${string}`;
  alias: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address }: { address?: `0x${string}` } = req.query;

  if (req.method === "POST") {
    const { signature, alias }: ReqBody = req.body;

    console.log(`Setting alias ${alias} for address ${address} with signature ${signature}`);

    if (!signature || !address || !alias) {
      res.status(400).json({ error: "Missing required parameters." });
      return;
    }

    if (alias.length > 64 || alias.length < 3) {
      res.status(400).json({ error: "Alias must be between 3 and 64 characters." });
      return;
    }

    let valid = false;
    try {
      const message = JSON.stringify({ action: "save-alias", address: address, alias });
      valid = await verifyMessage({
        address,
        message,
        signature,
      })
    } catch (error) {
      res.status(400).json({ error: "Error recovering the signature" });
      return;
    }

    if (!valid) {
      res.status(403).json({ error: "The signature is not valid" });
      return;
    }

    const bgUrl = "https://buidlguidl-v3.ew.r.appspot.com/builders";

    let isMember = false;

    const response = await fetch(bgUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      isMember = data.filter((member: any) => member.id === address).length > 0;
    }

    if (!isMember) {
      res.status(403).json({ error: "Only BuidlGuidl members can set an alias" });
      return;
    }

    const value = {
      "addresses": {
        "60": address
      }
    };

    const currentAlias = await kv.get(`ens-address:${address}`);
    if (currentAlias && currentAlias === alias) {
      res.status(200).json(alias);
      return;
    }

    const aliasRecord = await kv.hget(`ens:${alias}`, "addresses");
    console.log(`Alias record: ${aliasRecord}`);
    if (aliasRecord) {
      console.log(`Alias ${alias} already exists`);
      res.status(400).json({ error: "Alias already exists" });
      return;
    }

    if (currentAlias) {
      await kv.del(`ens:${currentAlias}`);
      await kv.srem(`ens:aliases:60`, `${address}:${currentAlias}`);
    }

    await kv.hset(`ens:${alias}.loogies.eth`, value);
    await kv.set(`ens-address:${address}`, alias);
    await kv.sadd(`ens:aliases:60`, `${address}:${alias}`);

    res.status(200).json(alias);
  } else {
    const alias = await kv.get(`ens-address:${address}`);

    res.status(200).json(alias);
  }
}
