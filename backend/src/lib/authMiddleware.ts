import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'ipoms_dev_access_secret_super_secure_key_2026';

export interface AuthUserPayload {
  userId: string;
  email: string;
  roles: string[];
  fullName: string;
}

// The Express Request augmentation for `req.user` lives in src/types/express.d.ts
// so that modules compiled in isolation still see it.

/**
 * Middleware to authenticate requests using JWT Bearer Token.
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Allow OPTIONS preflight through
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Check Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_TOKEN_MISSING',
        message: 'Authentication token is missing. Please sign in to continue.',
      },
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_TOKEN_MALFORMED',
        message: 'Authorization header format must be "Bearer <token>".',
      },
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED_TOKEN_EXPIRED',
          message: 'Your session has expired. Please sign in again.',
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_TOKEN_INVALID',
        message: 'Invalid authentication token.',
      },
    });
  }
}

/**
 * Middleware to enforce role-based access control (RBAC).
 * Requires `authenticateJWT` to be executed first.
 */
export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before checking permissions.',
        },
      });
    }

    const userRoles = req.user.roles || [];
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
    const hasRole = userRoles.some((role) => {
      const uRole = role.toUpperCase();
      if (normalizedAllowed.includes(uRole)) return true;
      if (uRole === 'ADMIN' && normalizedAllowed.includes('ADMINISTRATOR')) return true;
      if (uRole === 'ADMINISTRATOR' && normalizedAllowed.includes('ADMIN')) return true;
      return false;
    });

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
          message: `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
        },
      });
    }

    return next();
  };
}
