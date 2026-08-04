import { LRUCache } from 'lru-cache';

const urlCache = new LRUCache({
    max: 5000,
    ttl: 5 * 60 * 1000,
});

export default urlCache;