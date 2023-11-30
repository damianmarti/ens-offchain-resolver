import { kv } from "@vercel/kv";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const aliases = await kv.smembers(`ens:aliases:60`);

  res.status(200).json(aliases);
}
