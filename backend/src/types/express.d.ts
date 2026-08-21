import type { AuthUserPayload } from '../lib/authMiddleware';

/**
 * Attaches the verified JWT payload to Express's Request.
 *
 * This lives in its own ambient declaration rather than inside
 * authMiddleware.ts so that any module can rely on `req.user` without importing
 * the middleware purely for its side effect — a file compiled in isolation
 * (e.g. a script under src/scripts) would otherwise not see the augmentation
 * and fail with "Property 'user' does not exist on type 'Request'".
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export {};
