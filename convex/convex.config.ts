import { defineApp } from 'convex/server';
import staticHosting from '@convex-dev/static-hosting/convex.config';
import agent from '@convex-dev/agent/convex.config';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
const app=defineApp({httpPrefix:'/api'});
app.use(staticHosting,{httpPrefix:'/'});app.use(agent);app.use(rateLimiter);
export default app;
