import { promises as dns } from 'dns';
import isEmail from 'email-validator'; // Already in your package.json

/**
 * EMAIL VALIDATION ENGINE (GOLD STANDARD)
 * Layers:
 * 1. Syntactic: RFC-compliant check.
 * 2. Disposable: Checked against frequently updated community lists.
 * 3. DNS/MX: Real-time check to ensure the domain can actually receive mail.
 */

// Recommendation: For the "Disposable" list, 
// Senior devs use a package like 'disposable-email-domains' 
// which is updated weekly by the community.
import disposableList from 'disposable-email-domains' assert { type: 'json' };

const DISPOSABLE_SET = new Set(disposableList);

export async function validateEmailProfessional(email: string): Promise<{
    isValid: boolean;
    reason?: string;
}> {
    const cleanEmail = email.trim().toLowerCase();

    // LAYER 1: Syntax (Using package-standard)
    if (!isEmail.validate(cleanEmail)) {
        return { isValid: false, reason: 'Invalid email format.' };
    }

    const domain = cleanEmail.split('@')[1];

    // LAYER 2: Disposable Domain Blocklist (Package-based)
    if (DISPOSABLE_SET.has(domain)) {
        return { isValid: false, reason: 'Disposable email addresses are not permitted.' };
    }

    // LAYER 3: DNS Verification (The Pro Move)
    // We verify the domain has MX records. This blocks domains that are set up
    // specifically for spam or temporary use that haven't hit the blocklists yet.
    try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
            return { isValid: false, reason: 'The email domain does not exist or cannot receive mail.' };
        }
    } catch (error) {
        // If DNS lookup fails, the domain is likely fake or a misconfigured temp domain
        return { isValid: false, reason: 'Unable to verify email deliverability.' };
    }

    return { isValid: true };
}