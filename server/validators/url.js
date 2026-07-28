const { z } = require('zod');

const shortenSchema = z.object({
    originalUrl: z.string().trim().min(1).max(2048), // cap length — prevents abuse via giant strings
});

module.exports = { shortenSchema };