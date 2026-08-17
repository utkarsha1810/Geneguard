// Environment configuration check for Gene-Guard backend
export const validateEnvironment = () => {
  const requiredVars = [
    { name: 'PORT', default: '5050' },
    { name: 'MONGODB_URI', default: 'mongodb://localhost:27017/gene-guard' },
    { name: 'JWT_SECRET', default: 'gene_guard_jwt_secret_key_2026_super_secure' },
    { name: 'ADMIN_SECRET_CODE', default: 'GENE_GUARD_ADMIN_2026' },
  ];

  const missing = [];

  requiredVars.forEach(({ name, default: defaultValue }) => {
    if (!process.env[name]) {
      missing.push(name);
      process.env[name] = defaultValue;
    }
  });

  if (missing.length > 0) {
    console.warn(`[ENV CHECK] ⚠️ Missing env variables: [${missing.join(', ')}]. Applied fallback defaults.`);
  } else {
    console.log('[ENV CHECK] ✓ All core environment variables present');
  }

  if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_KEY_1) {
    console.warn('[ENV CHECK] ⚠️ GEMINI_API_KEY not configured. AI fallback mode active.');
  }

  return true;
};

export default validateEnvironment;
