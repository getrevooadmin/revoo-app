import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { db } from './db';

// Extend Express Request type to include the authenticated user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'merchant' | 'consumer' | 'admin';
        businessId: string | null;
        phone: string | null;
      };
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || '';
// Use service role key to query public.profiles bypassing RLS if needed,
// but auth verification happens securely via supabase.auth.getUser()
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  },
  realtime: {
    transport: ws as any
  }
});

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid format. Expected Bearer <token>' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token using Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    // Load the user's profile from the database
    const profile = await db.getProfile(user.id);
    
    if (!profile) {
      return res.status(403).json({ error: 'User profile not found. Access denied.' });
    }

    // Attach user profile info to the request object
    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role,
      businessId: profile.business_id,
      phone: profile.phone,
    };

    next();
  } catch (error: any) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication internal server error' });
  }
}

export function requireRole(allowedRoles: ('merchant' | 'consumer' | 'admin')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of the following roles: ${allowedRoles.join(', ')}` });
    }

    // Additional check for merchants: must have a business_id linked
    if (req.user.role === 'merchant' && !req.user.businessId) {
      return res.status(403).json({ error: 'Forbidden: Merchant account is not linked to a business' });
    }

    next();
  };
}
