import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missingEnv = requiredEnv.filter((key) => {
  const value = process.env[key];
  return !value || value.includes('YOUR_') || value.includes('placeholder');
});

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-me',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  missingEnv,
};

export function assertRequiredEnv() {
  if (config.missingEnv.length > 0) {
    console.warn(`⚠️  Missing or placeholder env vars: ${config.missingEnv.join(', ')}`);
  }
}
