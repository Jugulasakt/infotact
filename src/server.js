const app = require('./app');
const env = require('./config/env');
const { connectMongo } = require('./db/mongo');

async function bootstrap() {
  await connectMongo();

  app.listen(env.port, () => {
    console.log(`[api] listening on :${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[api] bootstrap failed', err);
  process.exit(1);
});
