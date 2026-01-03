import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { prisma } from '../db/index.js';

/**
 * GENERATE UNIQUE USERNAME
 * Gold Standards:
 * - URL-Friendly: Uses hyphens (-) instead of underscores (_) for better SEO and readability.
 * - Collision Safety: Includes a retry limit to prevent infinite loops in high-concurrency scenarios.
 * - Entropy: Combines dictionaries with a numeric suffix for a high unique-combination ceiling.
 */

const MAX_RETRIES = 10;

export async function generateUniqueUsername(): Promise<string> {
    let username: string = '';
    let exists = true;
    let attempts = 0;

    while (exists && attempts < MAX_RETRIES) {
        const name = uniqueNamesGenerator({
            dictionaries: [adjectives, colors, animals],
            separator: '-', // Changed to hyphen as per gold standards for slugs
            length: 2,
        });
        
        // Standard random suffix to ensure higher entropy
        const number = Math.floor(Math.random() * 1000);
        username = `${name}-${number}`.toLowerCase();

        const count = await prisma.expert.count({ where: { username } });
        exists = count > 0;
        attempts++;
    }

    if (attempts >= MAX_RETRIES) {
        // Fallback: Use a timestamp-based suffix if names are colliding heavily
        username = `expert-${Date.now()}`;
    }

    return username;
}