function validateEnv() {
    const required = [
        'MONGO_URI',
        'PORT',
        'SESSION_SECRET',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_CALLBACK_URL',
        'FRONTEND_URL',
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

export default validateEnv;