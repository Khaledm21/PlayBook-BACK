export interface AuthUser {
  userId: string;
  email: string;
  role: 'USER' | 'VENUE_OWNER' | 'ADMIN' | string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

