import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access denied, token missing!' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Token is not valid!' });
      return;
    }
    req.user = user;
    next();
  });
};
