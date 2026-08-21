"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    full_name: {
        type: String,
        required: [true, 'Display name is mandatory'],
        trim: true,
    },
    username: {
        type: String,
        required: [true, 'Username is mandatory'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    official_email: {
        type: String,
        required: [true, 'Official email is mandatory'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    personal_email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
    },
    employee_id: {
        type: String,
        trim: true,
        default: '',
    },
    password_hash: {
        type: String,
        required: [true, 'Password hash is mandatory'],
    },
    primary_mobile: {
        type: String,
        trim: true,
        default: '',
    },
    secondary_mobile: {
        type: String,
        trim: true,
        default: '',
    },
    alternate_mobile: {
        type: String,
        trim: true,
        default: '',
    },
    residential_address: {
        type: String,
        trim: true,
        default: '',
    },
    date_of_birth: {
        type: Date,
        default: null,
    },
    date_of_joining: {
        type: Date,
        default: null,
    },
    profile_photo_url: {
        type: String,
        default: '',
    },
    photo_last_updated_at: {
        type: Date,
        default: null,
    },
    is_profile_locked: {
        type: Boolean,
        default: false,
        index: true,
    },
    profile_locked_at: {
        type: Date,
        default: null,
    },
    monthly_password_changes_count: {
        type: Number,
        default: 0,
    },
    last_password_change_month: {
        type: String,
        default: '',
    },
    is_password_locked: {
        type: Boolean,
        default: false,
        index: true,
    },
    password_locked_at: {
        type: Date,
        default: null,
    },
    account_status: {
        type: String,
        enum: ['active', 'inactive', 'blocked', 'deactivated'],
        default: 'active',
        index: true,
    },
    presence_status: {
        type: String,
        enum: ['available', 'busy', 'be_right_back', 'away', 'appear_offline', 'out_of_office'],
        default: 'available',
        index: true,
    },
    role_ids: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Role',
            index: true,
        },
    ],
    role_codes: {
        type: [String],
        default: [],
        index: true,
    },
    assigned_college_ids: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'College',
            index: true,
        },
    ],
    is_email_verified: {
        type: Boolean,
        default: true,
    },
    must_change_password: {
        type: Boolean,
        default: false,
    },
    last_login_at: {
        type: Date,
        default: null,
    },
    last_password_changed_at: {
        type: Date,
        default: null,
    },
    /* ── Lockout & OTP reset ───────────────────────────────────────────────
       Counts consecutive failures; reset to 0 on any successful sign-in.
       Reaching the limit sets account_status='blocked' and stamps locked_at. */
    failed_login_attempts: {
        type: Number,
        default: 0,
    },
    locked_at: {
        type: Date,
        default: null,
    },
    /* The OTP is stored hashed, never in clear text: a database read must not
       hand an attacker a working reset code. */
    reset_otp_hash: {
        type: String,
        default: null,
        select: false,
    },
    reset_otp_expires_at: {
        type: Date,
        default: null,
    },
    /* Caps guesses against the OTP itself, so a 6-digit code cannot be
       brute-forced once issued. */
    reset_otp_attempts: {
        type: Number,
        default: 0,
    },
    is_deleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deleted_at: {
        type: Date,
        default: null,
    },
}, {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
UserSchema.index({ official_email: 1, account_status: 1 });
UserSchema.index({ role_codes: 1, account_status: 1 });
exports.User = mongoose_1.default.model('User', UserSchema);
