import { app } from './index';

const port = Number(process.env.API_PORT || process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`[Mamasar Elysia API] listening on http://localhost:${port}/api`);
});
