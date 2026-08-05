import { isSpoofedBot } from "@arcjet/inspect";
import aj from "../config/arcjet.js";
import logger from "../config/logger.js";

async function arcjetBotProtection(req, res, next) {
    if (!aj) {
        return next();
    }

    try {
        const decision = await aj.protect(req);
        
        if (decision.isErrored()) {
            logger.error({ err: decision.reason.message }, 'Arcjet bot check errored - failing open');
            return next();
        }

        if (decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({ error: 'Automated requests are not allowed.' });
        }

        if (decision.results.some(isSpoofedBot)) {
            return res.status(403).json({ error: 'Automated requests are not allowed.' });
        }

        return next();
    } catch (err) {
        logger.error({ err }, 'Unexpected error in bot protection middleware - failing open');
        return next();
    }
}

export default arcjetBotProtection;