import { createServerAdapter } from '@vercel/node';

export default createServerAdapter((req, res) => {
  res.status(200).json({ status: 'ok' });
});
