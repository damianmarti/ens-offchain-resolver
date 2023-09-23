import { kv } from "@vercel/kv";
import { NextApiRequest, NextApiResponse } from "next";
import testJson from "~~/test.eth.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // this is only for testing

    await kv.hset("ens:test.eth", testJson["test.eth"]);
    await kv.hset("ens:*.test.eth", testJson["*.test.eth"]);

    res.status(200).json(testJson);
  }
}
