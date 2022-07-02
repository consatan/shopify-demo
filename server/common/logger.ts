import pino from 'pino';

const l = pino({
  name: process.env.APP_ID || 'shopify_demo',
  level: process.env.LOG_LEVEL || 'debug',
});

export default l;
