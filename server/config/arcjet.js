import arcjet, { detectBot } from "@arcjet/node";

const aj = process.env.ARCJET_KEY
    ? arcjet({
        key: process.env.ARCJET_KEY,
        rules: [
            detectBot({
                mode: 'LIVE',
                allow: [
                    'CATEGORY:SEARCH_ENGINE',
                    'CATEGORY:PREVIEW',
                    'CATEGORY:MONITOR',
                ],
            }),
        ],
    })
    : null;

export default aj;