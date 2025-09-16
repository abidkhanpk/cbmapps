import type { NextApiRequest, NextApiResponse } from 'next';
import { solveSpringMass } from './systemUtils';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const params = req.body;
  const result = solveSpringMass(params);
  res.json(result);
}
