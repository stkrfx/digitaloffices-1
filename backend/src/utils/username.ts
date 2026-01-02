import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { prisma } from '../db/index.js';

export async function generateUniqueUsername(): Promise<string> {
    let username: string;
    let exists = true;

    do {
        const name = uniqueNamesGenerator({
            dictionaries: [adjectives, colors, animals],
            separator: '_',
            length: 2,
        });
        const number = Math.floor(Math.random() * 100);
        username = `${name}_${number}`;

        const count = await prisma.expert.count({ where: { username } });
        exists = count > 0;
    } while (exists);

    return username;
}