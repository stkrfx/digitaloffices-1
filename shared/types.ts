import { z } from "zod";

// --------------------------------------
// ENUMS & CONSTANTS
// --------------------------------------

export const ROLES = {
    USER: "user",
    EXPERT: "expert",
    ORGANIZATION: "organization",
    ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES = {
    SUPER_ADMIN: "SUPER_ADMIN",
    MODERATOR: "MODERATOR",
} as const;

export type AdminRole = (typeof ADMIN_ROLES)[keyof typeof ADMIN_ROLES];

// --------------------------------------
// API RESPONSE STANDARDS
// --------------------------------------

export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: {
        code: string;
        details?: unknown; // Zod error issues or other details
    };
}

// --------------------------------------
// AUTHENTICATION SCHEMAS (ZOD)
// --------------------------------------

// Password Rules: Min 8 chars, 1 number, 1 special char
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

// 1. LOGIN
export const LoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// 2. REGISTER - USER
export const UserRegisterSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    name: z.string().min(2, "Name is required"),
});

export type UserRegisterInput = z.infer<typeof UserRegisterSchema>;

// 3. REGISTER - EXPERT
export const ExpertRegisterSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    name: z.string().min(2, "Name is required"),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
        .optional(),
});

export type ExpertRegisterInput = z.infer<typeof ExpertRegisterSchema>;

// 4. REGISTER - ORGANIZATION
export const OrganizationRegisterSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    companyName: z.string().min(2, "Company name is required"),
    regNumber: z.string().optional(),
    websiteUrl: z.string().url().optional().or(z.literal("")),
});

export type OrganizationRegisterInput = z.infer<typeof OrganizationRegisterSchema>;

// 5. REGISTER - ADMIN (Usually seeded or invited, but schema needed for completeness)
export const AdminRegisterSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    name: z.string().min(2, "Name is required"),
    role: z.nativeEnum(ADMIN_ROLES),
});

export type AdminRegisterInput = z.infer<typeof AdminRegisterSchema>;

// --------------------------------------
// JWT PAYLOAD
// --------------------------------------

export interface JwtPayload {
    id: string;
    role: Role;
    iat?: number;
    exp?: number;
}

export const UpdateExpertProfileSchema = z.object({
    headline: z.string().max(100).optional(),
    bio: z.string().max(2000).optional(),
    hourlyRate: z.number().min(0).optional(),
    specialties: z.array(z.string()).max(10).optional(),
    avatarUrl: z.string().url().optional(),
});

export const UpdateUserProfileSchema = z.object({
    name: z.string().min(2).optional(),
    avatarUrl: z.string().url().optional(),
    promotionalEmailsEnabled: z.boolean().optional(),
});

export const UpdateOrganizationProfileSchema = z.object({
    companyName: z.string().min(2).optional(),
    logoUrl: z.string().url().optional(),
    websiteUrl: z.string().url().optional().or(z.literal("")),
    regNumber: z.string().optional(),
});