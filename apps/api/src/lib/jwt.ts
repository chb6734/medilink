import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  provider: 'google' | 'phone';
  subject: string;
  displayName?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
const JWT_EXPIRES_IN = '7d'; // 7일

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('JWT 검증 실패:', error);
    return null;
  }
}
