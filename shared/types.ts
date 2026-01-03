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

// --------------------------------------
// DOMAIN ENUMS
// --------------------------------------

export const BOOKING_STATUS = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED",
    NO_SHOW: "NO_SHOW",
} as const;

export type BookingStatusType = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const THEME_PREFERENCE = {
    LIGHT: "LIGHT",
    DARK: "DARK",
    SYSTEM: "SYSTEM",
} as const;

export type ThemePreferenceType = (typeof THEME_PREFERENCE)[keyof typeof THEME_PREFERENCE];


// --------------------------------------
// AVAILABILITY SCHEMAS
// --------------------------------------

const timeStringRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const SyncAvailabilitySchema = z.object({
    slots: z.array(
        z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string().regex(timeStringRegex, "Invalid start time format (HH:mm)"),
            endTime: z.string().regex(timeStringRegex, "Invalid end time format (HH:mm)"),
        }).refine((data) => {
            const [startH, startM] = data.startTime.split(":").map(Number);
            const [endH, endM] = data.endTime.split(":").map(Number);
            return endH > startH || (endH === startH && endM > startM);
        }, {
            message: "End time must be after start time",
            path: ["endTime"],
        })
    ),
});

export type SyncAvailabilityInput = z.infer<typeof SyncAvailabilitySchema>;

// --------------------------------------
// SERVICE SCHEMAS
// --------------------------------------

const serviceCore = {
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().max(1000).optional(),
    price: z.coerce.number().positive("Price must be a positive value"),
    durationMin: z.coerce.number().int().min(5, "Minimum duration is 5 minutes"),
};

export const CreateServiceSchema = z.object({
    ...serviceCore,
    expertId: z.string().uuid().optional(),
    organizationId: z.string().uuid().optional(),
}).refine(data => data.expertId || data.organizationId, {
    message: "Service must belong to either an Expert or an Organization",
    path: ["expertId"],
});

export const UpdateServiceSchema = z.object({
    title: serviceCore.title.optional(),
    description: serviceCore.description.optional(),
    price: serviceCore.price.optional(),
    durationMin: serviceCore.durationMin.optional(),
    isActive: z.boolean().optional(),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;

// --------------------------------------
// BOOKING SCHEMAS
// --------------------------------------

export const CreateBookingSchema = z.object({
    serviceId: z.string().uuid("Invalid Service ID"),
    startTime: z.coerce.date().refine((date) => date > new Date(), {
        message: "Booking time must be in the future",
    }),
});

export const UpdateBookingStatusSchema = z.object({
    status: z.nativeEnum(BOOKING_STATUS),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>;

// --------------------------------------
// REVIEW SCHEMAS
// --------------------------------------

export const CreateReviewSchema = z.object({
    bookingId: z.string().uuid("Invalid Booking ID"),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

// --------------------------------------
// PREFERENCE SCHEMAS
// --------------------------------------

export const UpdatePreferenceSchema = z.object({
    theme: z.nativeEnum(THEME_PREFERENCE).optional(),
    language: z.string().min(2).max(5).optional(),
    timezone: z.string().refine((tz) => {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            return true;
        } catch (e) {
            return false;
        }
    }, { message: "Invalid timezone" }).optional(),
});

export type UpdatePreferenceInput = z.infer<typeof UpdatePreferenceSchema>;

export const GetAvailabilitySchema = z.object({
    params: z.object({
        expertId: z.string().uuid(),
    }),
});

// Add to BOOKING SCHEMAS section
export const GetProviderBookingsSchema = z.object({
    query: z.object({
        role: z.enum(["EXPERT", "ORGANIZATION"]),
    }),
});

// Add to SERVICE SCHEMAS section
export const GetServicesSchema = z.object({
    params: z.object({
        providerId: z.string().uuid(),
    }),
    query: z.object({
        type: z.enum(["expert", "organization"]),
    }),
});

export const DeleteServiceSchema = z.object({
    params: z.object({
        serviceId: z.string().uuid(),
    }),
});

// Add to REVIEW SCHEMAS section
export const GetProviderReviewsSchema = z.object({
    params: z.object({
        providerId: z.string().uuid(),
    }),
    query: z.object({
        type: z.enum(["expert", "organization"]),
    }),
});