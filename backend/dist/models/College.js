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
exports.College = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CollegeSchema = new mongoose_1.Schema({
    college_name: {
        type: String,
        required: [true, 'College name is mandatory'],
        unique: true,
        trim: true,
        index: true,
    },
    college_code: {
        type: String,
        required: [true, 'College short form / code is mandatory'],
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    location: {
        type: String,
        trim: true,
        default: 'Tamil Nadu, India',
    },
    college_website: {
        type: String,
        trim: true,
        default: '',
    },
    tpo_name: {
        type: String,
        trim: true,
        default: '',
    },
    tpo_email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
    },
    tpo_contact_mobile: {
        type: String,
        trim: true,
        default: '',
    },
    departments: {
        type: [String],
        default: ['CSE', 'IT', 'AI & DS', 'ECE', 'EEE', 'MECH'],
    },
    student_strength: {
        type: Number,
        default: 0,
    },
    nirf_ranking: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_hold'],
        default: 'active',
        index: true,
    },
    assigned_coordinator_ids: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
    ],
}, {
    collection: 'colleges',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});
CollegeSchema.index({ status: 1, college_code: 1 });
exports.College = mongoose_1.default.model('College', CollegeSchema);
