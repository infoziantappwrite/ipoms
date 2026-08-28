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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const xlsx = __importStar(require("xlsx"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
const sanitize = (val) => {
    if (val === undefined || val === null)
        return '';
    const str = String(val).trim();
    if (str === '#VALUE!' || str === 'NIL' || str === 'None' || str === 'null')
        return '';
    return str;
};
const sanitizePhone = (val) => {
    const raw = sanitize(val);
    if (!raw)
        return '';
    return raw.replace(/[^\d+]/g, '').trim();
};
const sanitizeEmail = (val) => {
    const raw = sanitize(val).toLowerCase();
    if (raw.includes('@') && raw.includes('.'))
        return raw;
    return '';
};
// Known locations map for clean defaults
const LOCATION_MAP = {
    ACET: 'Puducherry',
    KIOT: 'Salem, Tamil Nadu',
    KLU: 'Virudhunagar, Tamil Nadu',
    KPR: 'Coimbatore, Tamil Nadu',
    KARPAGAM: 'Coimbatore, Tamil Nadu',
    AIHT: 'Chennai, Tamil Nadu',
    PSNA: 'Dindigul, Tamil Nadu',
    SMVEC: 'Puducherry',
    DSU: 'Perambalur / Trichy, Tamil Nadu',
    MKCE: 'Karur, Tamil Nadu',
    SONA: 'Salem, Tamil Nadu',
    KARUNYA: 'Coimbatore, Tamil Nadu',
    KAMARAJ: 'Virudhunagar, Tamil Nadu',
    NPR: 'Natham / Dindigul, Tamil Nadu',
    AVS: 'Salem, Tamil Nadu',
    AAA: 'Sivakasi, Tamil Nadu',
    KGISL: 'Coimbatore, Tamil Nadu',
    SSEI: 'Salem, Tamil Nadu',
    NGP: 'Coimbatore, Tamil Nadu',
    HITS: 'Chennai, Tamil Nadu',
    NEHRU: 'Coimbatore, Tamil Nadu',
    MAR: 'Kanyakumari, Tamil Nadu',
    NGCE: 'Kanyakumari, Tamil Nadu',
    ACEW: 'Kanyakumari, Tamil Nadu',
};
const LOGO_MAP = {
    ACET: '/college-logos/acet.png',
    KIOT: '/college-logos/kiot.jfif',
    KLU: '/college-logos/klu.png',
    KPR: '/college-logos/kpr.png',
    KARPAGAM: '/college-logos/karpagam.png',
    AIHT: '/college-logos/aiht.png',
    PSNA: '/college-logos/psna.png',
    SMVEC: '/college-logos/smvec.png',
    DSU: '/college-logos/dsu.png',
    MKCE: '/college-logos/mkce.png',
    SONA: '/college-logos/sona.png',
    KARUNYA: '/college-logos/karunya.png',
    KAMARAJ: '/college-logos/kamaraj.png',
    NPR: '/college-logos/npr.png',
    AVS: '/college-logos/avs.png',
    AAA: '/college-logos/aaa.png',
    KGISL: '/college-logos/kgisl.png',
    SSEI: '/college-logos/sri shanmuga.png',
    NGP: '/college-logos/ngp.png',
    HITS: '/college-logos/hits.png',
    NEHRU: '/college-logos/Infozianthead.png',
    MAR: '/college-logos/mar ephream.png',
    NGCE: '/college-logos/narayanaguru.png',
    ACEW: '/college-logos/ACEW.jfif',
    // Additional partner institutions
    KCT: '/college-logos/kumaraguru.png',
    PSG: '/college-logos/psg.png',
    LICET: '/college-logos/layola.png',
    PEC: '/college-logos/panimalar.png',
    RTC: '/college-logos/Rathinam - RTC.png',
    SIT: '/college-logos/sethu institue.png',
    SECE: '/college-logos/srieshwar.png',
    SRM: '/college-logos/srm .png',
    VIT: '/college-logos/vit.png',
    KIT: '/college-logos/kit.png',
    EGS: '/college-logos/egs.png',
    GCT: '/college-logos/gnyanamani.png',
    IFET: '/college-logos/ifet.png',
    CHRIST: '/college-logos/christ.png',
    VCE: '/college-logos/vaigai.png',
};
async function seedCollegesAndCoordinators() {
    console.log('\n=============================================================');
    console.log('🏛️ INFOZIANT iPOMS — COLLEGES & COORDINATORS INGESTION ENGINE');
    console.log('=============================================================\n');
    try {
        await (0, database_1.connectDatabase)();
        // Drop legacy employee_id unique index if present
        try {
            await User_1.User.collection.dropIndex('employee_id_1');
            console.log('🧹 [MongoDB] Dropped legacy employee_id index.');
        }
        catch (e) {
            // Index might already not exist
        }
        const excelPath = path_1.default.resolve(__dirname, '../../../Colleges and Coordinators.xlsx');
        console.log(`📖 [Excel] Reading workbook from: ${excelPath}`);
        const workbook = xlsx.readFile(excelPath);
        // 1. INGEST COLLEGES
        const collegeSheet = workbook.Sheets['College'];
        if (!collegeSheet) {
            throw new Error('Sheet "College" not found in workbook');
        }
        const rawColleges = xlsx.utils.sheet_to_json(collegeSheet, { defval: '' });
        console.log(`\n🏛️ [Colleges] Found ${rawColleges.length} colleges in Excel sheet...`);
        let collegeCount = 0;
        for (const row of rawColleges) {
            const collegeName = sanitize(row['College Name']);
            const shortForm = sanitize(row['Short Form']).toUpperCase();
            let location = sanitize(row['Location']);
            if (!collegeName || !shortForm)
                continue;
            if (!location) {
                location = LOCATION_MAP[shortForm] || 'Tamil Nadu, India';
            }
            const tpoName = sanitize(row['TPO Name']);
            const tpoEmail = sanitizeEmail(row['Email ID']);
            const tpoContact = sanitizePhone(row['TPO Contact Number']);
            const logoUrl = LOGO_MAP[shortForm] || '/college-logos/Infozianthead.png';
            let collegeDoc = await College_1.College.findOne({ college_code: shortForm });
            if (!collegeDoc) {
                collegeDoc = await College_1.College.create({
                    college_name: collegeName,
                    college_code: shortForm,
                    location,
                    logo_url: logoUrl,
                    tpo_name: tpoName,
                    tpo_email: tpoEmail,
                    tpo_contact_mobile: tpoContact,
                    status: 'active',
                    assigned_coordinator_ids: [],
                });
                console.log(`   ➔ [Added] ${shortForm} — ${collegeName} (${location}) [Logo: ${logoUrl}]`);
            }
            else {
                collegeDoc.college_name = collegeName;
                collegeDoc.location = location;
                collegeDoc.logo_url = logoUrl;
                collegeDoc.tpo_name = tpoName;
                collegeDoc.tpo_email = tpoEmail;
                collegeDoc.tpo_contact_mobile = tpoContact;
                await collegeDoc.save();
                console.log(`   ➔ [Updated] ${shortForm} — ${collegeName} [Logo: ${logoUrl}]`);
            }
            collegeCount++;
        }
        // 2. INGEST COORDINATORS
        const coordinatorSheet = workbook.Sheets['Coordinators'];
        if (!coordinatorSheet) {
            throw new Error('Sheet "Coordinators" not found in workbook');
        }
        const rawCoordinators = xlsx.utils.sheet_to_json(coordinatorSheet, { defval: '' });
        console.log(`\n👥 [Coordinators] Found ${rawCoordinators.length} coordinators in Excel sheet...`);
        const coordinatorRole = await Role_1.Role.findOne({ role_code: 'PLACEMENT_COORDINATOR' });
        const teamLeadRole = await Role_1.Role.findOne({ role_code: 'TEAM_LEAD' });
        const defaultPasswordHash = await bcryptjs_1.default.hash('iPOMS@123', 12);
        function deriveCleanUsername(fullName) {
            let cleaned = fullName.trim();
            // Only remove leading single initial with a dot (e.g. "A. Mohanaradha" or "A.Mohanaradha")
            cleaned = cleaned.replace(/^[A-Za-z]\.\s*/i, '');
            // Remove trailing single initials (e.g. "Thirisha R", "Malavika Ramesh T K")
            cleaned = cleaned.replace(/\s+[A-Za-z]\.?\s*$/i, '');
            cleaned = cleaned.replace(/\s+[A-Za-z]\.?\s*$/i, '');
            const firstWord = cleaned.split(/\s+/)[0];
            return (firstWord || cleaned || 'coordinator').toLowerCase();
        }
        let coordCount = 0;
        for (const row of rawCoordinators) {
            const fullName = sanitize(row['Coordinator Name']);
            const email = sanitizeEmail(row['Coordinator Email ID'] || row['Official Email']);
            const phone = sanitizePhone(row['Coordinator Contact Number'] || row['Mobile']);
            if (!fullName || !email)
                continue;
            const cleanUsername = deriveCleanUsername(fullName);
            const isTeamLead = fullName.toLowerCase().includes('sujitha') || email.toLowerCase().includes('sujitha');
            const roleCode = isTeamLead ? 'TEAM_LEAD' : 'PLACEMENT_COORDINATOR';
            const roleObj = isTeamLead ? teamLeadRole : coordinatorRole;
            let userDoc = await User_1.User.findOne({ official_email: email });
            if (!userDoc) {
                userDoc = await User_1.User.create({
                    full_name: fullName,
                    username: cleanUsername,
                    official_email: email,
                    password_hash: defaultPasswordHash,
                    primary_mobile: phone,
                    account_status: 'active',
                    presence_status: 'available',
                    role_ids: roleObj ? [roleObj._id] : [],
                    role_codes: [roleCode],
                    assigned_college_ids: [],
                    is_email_verified: true,
                    must_change_password: false,
                    is_deleted: false,
                });
                console.log(`   ➔ [Added ${roleCode}] ${fullName} (Username: @${cleanUsername}, Email: ${email})`);
            }
            else {
                userDoc.full_name = fullName;
                userDoc.username = cleanUsername;
                userDoc.primary_mobile = phone;
                userDoc.role_codes = [roleCode];
                if (roleObj)
                    userDoc.role_ids = [roleObj._id];
                await userDoc.save();
                console.log(`   ➔ [Updated ${roleCode}] ${fullName} (Username: @${cleanUsername}, Email: ${email})`);
            }
            coordCount++;
        }
        console.log('\n=============================================================');
        console.log(`🎉 [SUCCESS] Ingested ${collegeCount} Colleges & ${coordCount} Coordinators into MongoDB!`);
        console.log('=============================================================\n');
    }
    catch (error) {
        console.error('❌ [ERROR] Failed to seed colleges and coordinators:', error);
    }
    finally {
        await (0, database_1.disconnectDatabase)();
        process.exit(0);
    }
}
seedCollegesAndCoordinators();
