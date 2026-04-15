import rateLimit from 'express-rate-limit';

/**
 * G2 Security Fix-Gate: Rate Limiting
 * We implement strict rate limiting specifically to prevent Denial of Service (DoS)
 * attacks on endpoints that can trigger expensive recursive filesystem transversals.
 */

// General API limit
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, message: 'Too many API requests, please try again later.' }
});

// Extremely strict limit for recursive tree/search operations
export const fsHeavyLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Max 30 deep recursive searches per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, message: 'Too many deep filesystem searches. Please wait 1 minute.' }
});
