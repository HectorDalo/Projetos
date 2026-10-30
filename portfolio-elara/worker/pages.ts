import { handleRequest } from './index';
import type { Env } from './index';
export default {
  fetch(request: Request, env: Env & { ASSETS: { fetch(request: Request): Promise<Response> } }) {
    return new URL(request.url).pathname.startsWith('/api/') ? handleRequest(request, env) : env.ASSETS.fetch(request);
  },
};
