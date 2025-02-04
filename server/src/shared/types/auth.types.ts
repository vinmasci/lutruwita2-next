import { Request } from 'express';
import { JWTPayload, AuthResult } from 'express-oauth2-jwt-bearer';

export interface Auth0User {
  sub: string;  // Auth0 user ID
  email?: string;
  name?: string;
}

export interface RequestWithAuth extends Request {
  user?: Auth0User;
  auth?: AuthResult;
}
