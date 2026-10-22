import { createApp } from './app.js';
import { config } from './config.js';

/**
 * API entrypoint.
 */
const app = createApp();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});
