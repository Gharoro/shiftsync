import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '7070', 10),
  prefix: process.env.API_PREFIX ?? 'api',
  version: process.env.API_VERSION ?? '1',
  nodeEnv: process.env.NODE_ENV ?? 'development',
}));
