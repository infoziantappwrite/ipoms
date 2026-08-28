import { Types } from 'mongoose';
import { DailyLead } from '../models/DailyLead';
import { College } from '../models/College';
import { User } from '../models/User';
import { CompanyMetadata } from '../models/CompanyMetadata';

export interface JdSeedItem {
  date: string;
  time: string;
  company: string;
  role: string;
  ctc: string;
  batch: string;
  collegeCode: string;
}

export const COLLEGE_META_MAP: Record<string, { name: string; location: string; aliases: string[] }> = {
  KAMARAJ: { name: 'Kamaraj College of Engineering and Technology', location: 'Virudhunagar, Tamil Nadu', aliases: ['KCET', 'KAMARAJ'] },
  KARPAGAM: { name: 'Karpagam College of Engineering', location: 'Coimbatore, Tamil Nadu', aliases: ['KCE', 'KARPAGAM'] },
  MKCE: { name: 'M.Kumarasamy College of Engineering', location: 'Karur, Tamil Nadu', aliases: ['MKCE'] },
  SMVEC: { name: 'Sri Manakula Vinayagar Engineering College', location: 'Puducherry', aliases: ['SMVEC'] },
  PSNA: { name: 'PSNA College of Engineering and Technology', location: 'Dindigul, Tamil Nadu', aliases: ['PSNA'] },
  KLU: { name: 'Kalasalingam Academy of Research and Education', location: 'Virudhunagar, Tamil Nadu', aliases: ['KLU'] },
  DSU: { name: 'Dhanalakshmi Srinivasan University', location: 'Tiruchirappalli, Tamil Nadu', aliases: ['DSU'] },
  KIOT: { name: 'Knowledge Institute of Technology', location: 'Salem, Tamil Nadu', aliases: ['KIOT'] },
  SONA: { name: 'Sona College of Technology', location: 'Salem, Tamil Nadu', aliases: ['SONA'] },
  NPR: { name: 'NPR College of Engineering and Technology', location: 'Natham, Tamil Nadu', aliases: ['NPR'] },
  AIHT: { name: 'Anand Institute of Higher Technology', location: 'Chennai, Tamil Nadu', aliases: ['AIHT'] },
  KPR: { name: 'KPR Institute of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['KPR'] },
  ACEW: { name: 'Akshaya College of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['ACEW'] },
  HITS: { name: 'Hindustan Institute of Technology and Science', location: 'Chennai, Tamil Nadu', aliases: ['HITS'] },
  NEHRU: { name: 'Nehru Institute of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['NEHRU'] },
  NGCE: { name: 'Nandha College of Engineering', location: 'Erode, Tamil Nadu', aliases: ['NGCE'] },
  ACET: { name: 'Adithya Institute of Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['ACET'] },
  NGP: { name: 'Dr. N.G.P. Institute of Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['NGP', 'DRNGP'] },
};

export const MASTER_JD_RECEIVED_DATA: JdSeedItem[] = [
  // ── 07/07/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-07',
    time: '',
    company: 'InCoBAN',
    role: 'Multiple Roles',
    ctc: '3 LPA',
    collegeCode: 'KARPAGAM',
    batch: '2027',
  },

  // ── 07/08/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-08',
    time: '',
    company: 'SURYA’S MiB Enterprises',
    role: 'PCB Design Engineer',
    ctc: '3.6 LPA',
    collegeCode: 'SONA',
    batch: '2027',
  },
  {
    date: '2026-07-08',
    time: '',
    company: 'Avinya Infinity Solutions Pvt Ltd',
    role: 'Electrical Technical Engineer',
    ctc: '3 LPA',
    collegeCode: 'SONA',
    batch: '2027',
  },

  // ── 07/10/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-10',
    time: '11:52 AM',
    company: 'Espint',
    role: 'GET, NATS Trainee',
    ctc: '2.5 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },
  {
    date: '2026-07-10',
    time: '04:11 PM',
    company: 'Kyungshin Industrial Motherson(KIML)',
    role: 'GET',
    ctc: '2- 2.5 LPA',
    collegeCode: 'MKCE',
    batch: '2027',
  },
  {
    date: '2026-07-10',
    time: '08:30 PM',
    company: 'ZeAI Soft Pvt Ltd',
    role: 'AI & ML Developer / web developer',
    ctc: '5-8 LPA',
    collegeCode: 'KIOT',
    batch: '2027',
  },
  {
    date: '2026-07-10',
    time: '10:35 AM',
    company: 'ZeAI Soft Pvt Ltd',
    role: 'AI & ML Developer / web developer',
    ctc: '5-8 LPA',
    collegeCode: 'PSNA',
    batch: '2027',
  },
  {
    date: '2026-07-10',
    time: '08:18 PM',
    company: 'ZeAI Soft Pvt Ltd',
    role: 'AI & ML Developer / web developer',
    ctc: '5-8 LPA',
    collegeCode: 'NPR',
    batch: '2027',
  },
  {
    date: '2026-07-10',
    time: '08:24 AM',
    company: 'ZeAI Soft Pvt Ltd',
    role: 'AI & ML Developer / web developer',
    ctc: '5-8 LPA',
    collegeCode: 'KARPAGAM',
    batch: '2027',
  },

  // ── 07/16/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-16',
    time: '02:34 PM',
    company: 'Aptean - Cart Rabbit',
    role: 'Digital Marketing Executive',
    ctc: '4 - 5 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },

  // ── 07/22/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-22',
    time: '04:07 PM',
    company: 'SPK Power Infra Pvt Ltd',
    role: 'Junior Engineer',
    ctc: '3 LPA',
    collegeCode: 'NPR',
    batch: '2027',
  },

  // ── 07/23/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-23',
    time: '02:50 PM',
    company: 'Tactive',
    role: 'Project Executive',
    ctc: '5 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },

  // ── 07/27/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-27',
    time: '02:38 PM',
    company: 'Dongah Electric India Pvt Ltd',
    role: 'GET',
    ctc: '3 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },

  // ── 07/29/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-29',
    time: '12:23 PM',
    company: 'InCoban',
    role: 'Multiple Roles',
    ctc: '3 LPA',
    collegeCode: 'NPR',
    batch: '2027',
  },

  // ── 07/30/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-30',
    time: '05:15 PM',
    company: 'Robolog Automation',
    role: 'Multiple Roles For Automation',
    ctc: '3.6 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },
  {
    date: '2026-07-30',
    time: '12:08 PM',
    company: 'AquaAirX',
    role: 'Electrical & Embedded Systems Intern, Design Engineer (Mechanical), CAE Engineer.',
    ctc: '3.50 - 4 LPA',
    collegeCode: 'PSNA',
    batch: '2027',
  },

  // ── 07/31/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-07-31',
    time: '04:00 PM',
    company: 'InCoban',
    role: 'Multiple Roles',
    ctc: '3 LPA',
    collegeCode: 'ACET',
    batch: '2027',
  },
  {
    date: '2026-07-31',
    time: '04:17 PM',
    company: 'TCNOM Engineers Private Limited',
    role: 'Assisstant Engineer',
    ctc: '3-5 LPA',
    collegeCode: 'KARPAGAM',
    batch: '2027',
  },
  {
    date: '2026-07-31',
    time: '03:41 PM',
    company: 'InCoBAN',
    role: 'GET',
    ctc: '3 LPA',
    collegeCode: 'PSNA',
    batch: '2027',
  },
  {
    date: '2026-07-31',
    time: '10:26 AM',
    company: 'Cad Macro Design & Solutions Pvt. Ltd.',
    role: 'Software Engineer',
    ctc: '2.4 LPA',
    collegeCode: 'PSNA',
    batch: '2027',
  },
  {
    date: '2026-07-31',
    time: '11:03 AM',
    company: 'AquaAirX',
    role: 'Software Development Intern',
    ctc: '10k/month',
    collegeCode: 'PSNA',
    batch: '2027',
  },
  {
    date: '2026-07-31',
    time: '05:58 PM',
    company: 'GridSync Services Private Limited',
    role: 'Protection Engineer (EEE) | & Automation Engineer (ECE) (Testing & Commissioning Engineer)',
    ctc: '3 LPA',
    collegeCode: 'PSNA',
    batch: '2027',
  },

  // ── 08/04/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-04',
    time: '10:56 AM',
    company: 'Fristine Infotech Private Limited',
    role: 'Zoho Developer, Business Analyst, Data Engineer- Intern',
    ctc: 'Not Mentioned',
    collegeCode: 'PSNA',
    batch: '2027',
  },

  // ── 08/05/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-05',
    time: '11:00 AM',
    company: 'Tridots',
    role: 'Business Analyst',
    ctc: '4 - 4.5 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },

  // ── 08/06/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-06',
    time: '04:00 PM',
    company: 'Perfint Healthcare Ltd',
    role: 'QARA- Engineer, Intern - SDE',
    ctc: '5 - 6 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },
  {
    date: '2026-08-06',
    time: '10:54 AM',
    company: 'InCoban',
    role: 'Multiple Roles',
    ctc: '3 LPA',
    collegeCode: 'DSU',
    batch: '2027',
  },

  // ── 08/07/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-07',
    time: '01:08 PM',
    company: 'Fristine Infotech Private Limited',
    role: 'Zoho Developer, Business Analyst, Data Engineer- Intern',
    ctc: 'Not Mentioned',
    collegeCode: 'KIOT',
    batch: '2027',
  },

  // ── 08/11/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-11',
    time: '02:19 PM',
    company: 'Integra',
    role: 'Production Editor Trainee',
    ctc: '3 - 4 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },
  {
    date: '2026-08-11',
    time: '04:18 PM',
    company: 'V max Health Tech',
    role: 'Multiple Roles',
    ctc: '3 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },

  // ── 08/12/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-12',
    time: '02:27 PM',
    company: 'Resnet Solutions',
    role: 'ML Developer',
    ctc: '8 - 12 LPA',
    collegeCode: 'PSNA',
    batch: '2027',
  },
  {
    date: '2026-08-12',
    time: '02:23 PM',
    company: 'Resnet Solutions',
    role: 'ML Developer',
    ctc: '8 - 12 LPA',
    collegeCode: 'NGCE',
    batch: '2027',
  },
  {
    date: '2026-08-12',
    time: '02:20 PM',
    company: 'Resnet Solutions',
    role: 'ML Developer',
    ctc: '8 - 12 LPA',
    collegeCode: 'NEHRU',
    batch: '2027',
  },

  // ── 08/13/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-13',
    time: '12:05 PM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer',
    ctc: 'Not Mentioned',
    collegeCode: 'PSNA',
    batch: '2027',
  },
  {
    date: '2026-08-13',
    time: '04:27 PM',
    company: 'Kritilabs',
    role: 'Mechanical Engineering- Intern',
    ctc: '14k/M',
    collegeCode: 'ACET',
    batch: '2027',
  },

  // ── 08/14/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-14',
    time: '10:46 AM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer, Internal Coordinator',
    ctc: '3 LPA',
    collegeCode: 'KPR',
    batch: '2027',
  },
  {
    date: '2026-08-14',
    time: '09:58 AM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer, Internal Coordinator',
    ctc: '3 LPA',
    collegeCode: 'ACET',
    batch: '2027',
  },
  {
    date: '2026-08-14',
    time: '02:36 PM',
    company: 'Voltech',
    role: 'GTE (EEE)',
    ctc: '25,997/M',
    collegeCode: 'ACET',
    batch: '2027',
  },
  {
    date: '2026-08-14',
    time: '10:05 AM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer, Internal Coordinator',
    ctc: '3 LPA',
    collegeCode: 'NEHRU',
    batch: '2027',
  },
  {
    date: '2026-08-14',
    time: '10:02 AM',
    company: 'BIBUS INDIA PVT LTD',
    role: 'Design Engineer, Internal Coordinator',
    ctc: '3 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },

  // ── 08/18/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-18',
    time: '12:30 PM',
    company: 'Voltech Group',
    role: 'Graduate Trainee Engineer',
    ctc: '3.12 LPA',
    collegeCode: 'NEHRU',
    batch: '2027',
  },
  {
    date: '2026-08-18',
    time: '09:45 AM',
    company: 'CartRabbit',
    role: 'Digital Marketing/Product Support/Sales',
    ctc: '3 LPA',
    collegeCode: 'NGCE',
    batch: '2027',
  },
  {
    date: '2026-08-18',
    time: '09:47 AM',
    company: 'CartRabbit',
    role: 'Digital Marketing Intern',
    ctc: '3 LPA',
    collegeCode: 'ACEW',
    batch: '2027',
  },

  // ── 08/19/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-19',
    time: '02:37 PM',
    company: 'Rishabh Enterprises',
    role: 'GET',
    ctc: '3 - 4 LPA',
    collegeCode: 'PSNA',
    batch: '2027',
  },

  // ── 08/20/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-20',
    time: '12:26 PM',
    company: 'Brakes India Pvt Ltd',
    role: 'Graduate Engineer Trainee',
    ctc: '3.80 - 5.82 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-08-20',
    time: '10:14 AM',
    company: 'Fristine Infotech Pvt Ltd',
    role: 'Zoho Developer/Business Analyst/Data Engineer',
    ctc: '3 - 6 LPA',
    collegeCode: 'NEHRU',
    batch: '2027',
  },

  // ── 08/21/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-21',
    time: '12:02 PM',
    company: 'Loyal Wingman Technologies Pvt. Ltd.',
    role: 'GET',
    ctc: 'Not Mentioned',
    collegeCode: 'PSNA',
    batch: '2026, 2027',
  },
  {
    date: '2026-08-21',
    time: '04:27 PM',
    company: 'Loyal Wingman Technologies Pvt. Ltd.',
    role: 'GET',
    ctc: 'Not Mentioned',
    collegeCode: 'SMVEC',
    batch: '2026, 2027',
  },

  // ── 08/24/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-24',
    time: '11:19 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '12:41 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '11:19 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    collegeCode: 'NEHRU',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '12:43 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    collegeCode: 'NEHRU',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '03:16 PM',
    company: 'Pepagora',
    role: 'Inside Sales Associate/BDA',
    ctc: '10k/month & 4 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '11:17 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    collegeCode: 'KIOT',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '12:39 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    collegeCode: 'SMVEC',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '12:39 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    collegeCode: 'ACEW',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '11:19 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    collegeCode: 'PSNA',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '12:38 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    collegeCode: 'DSU',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '01:05 PM',
    company: 'Fristine Infotech Pvt Ltd',
    role: 'Zoho Developer/Business Analyst/Data Engineer',
    ctc: '3 - 6 LPA',
    collegeCode: 'SMVEC',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '11:17 AM',
    company: 'Crawl Crop India Pvt Ltd',
    role: 'Software Associate Trainee',
    ctc: '3.5 - 4 LPA',
    collegeCode: 'AIHT',
    batch: '2027',
  },
  {
    date: '2026-08-24',
    time: '12:42 AM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    collegeCode: 'ACEW',
    batch: '2027',
  },

  // ── 08/25/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-25',
    time: '02:01 PM',
    company: 'VLSI India',
    role: 'Multiple Roles',
    ctc: '5 - 30 LPA',
    collegeCode: 'NEHRU',
    batch: '2027',
  },
  {
    date: '2026-08-25',
    time: '04:29 PM',
    company: 'VLSI India',
    role: 'Multiple Roles',
    ctc: '5 - 30 LPA',
    collegeCode: 'HITS',
    batch: '2027',
  },
  {
    date: '2026-08-25',
    time: '04:26 PM',
    company: 'VLSI India',
    role: 'Multiple Roles',
    ctc: '5 - 30 LPA',
    collegeCode: 'SMVEC',
    batch: '2027',
  },
  {
    date: '2026-08-25',
    time: '12:39 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    collegeCode: 'SMVEC',
    batch: '2027',
  },
  {
    date: '2026-08-25',
    time: '12:26 PM',
    company: 'AquaAirX',
    role: 'Sourcing & Procurement Intern',
    ctc: '10k/month',
    collegeCode: 'SONA',
    batch: '2027',
  },
  {
    date: '2026-08-25',
    time: '02:05 PM',
    company: 'Loyal Wingman',
    role: 'Graduate Engineer Trainee',
    ctc: '3 LPA',
    collegeCode: 'SMVEC',
    batch: '2027',
  },
  {
    date: '2026-08-25',
    time: '04:51 PM',
    company: 'VLSI India',
    role: 'Multiple Roles',
    ctc: '5 - 30 LPA',
    collegeCode: 'SMVEC',
    batch: '2027',
  },

  // ── 08/27/2026 ─────────────────────────────────────────────────────────────
  {
    date: '2026-08-27',
    time: '05:48 PM',
    company: 'VLSI Technology',
    role: 'Multiple Roles',
    ctc: '4-5 LPA',
    collegeCode: 'NPR',
    batch: '2027',
  },
  {
    date: '2026-08-27',
    time: '02:58 PM',
    company: 'Modpro Engineering Solutions',
    role: 'Junior Engineer Trainee',
    ctc: '3-4 LPA',
    collegeCode: 'KIOT',
    batch: '2027',
  },
  {
    date: '2026-08-27',
    time: '03:21 PM',
    company: 'SL Lumax Limited',
    role: 'Automotive Manufacturing',
    ctc: '2.5 LPA',
    collegeCode: 'KLU',
    batch: '2027',
  },
];

export async function seedAugustAllCollegesJdReceived() {
  try {
    console.log('🌱 [Seed Master JD Received] Cleaning existing and seeding 55 verified JD records...');

    // 1. Resolve coordinator
    const defaultCoordinator =
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true }, role_codes: 'PLACEMENT_COORDINATOR' })) ||
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true } })) ||
      (await User.findOne({ is_deleted: { $ne: true } })) ||
      (await User.findOne({}));

    const coordinatorId = defaultCoordinator ? defaultCoordinator._id : new Types.ObjectId();

    // 2. Resolve/Upsert Colleges
    const collegeIdMap = new Map<string, Types.ObjectId>();

    for (const [code, meta] of Object.entries(COLLEGE_META_MAP)) {
      let college = await College.findOne({
        $or: [
          { college_code: code },
          { college_code: { $in: meta.aliases } },
          { college_name: meta.name },
        ],
      });

      if (!college) {
        college = await College.create({
          college_name: meta.name,
          college_code: code,
          location: meta.location,
          departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
          is_deleted: false,
        });
      } else if (college.college_code !== code) {
        const existingWithCode = await College.findOne({ college_code: code });
        if (!existingWithCode) {
          college.college_code = code;
          college.college_name = meta.name;
          await college.save();
        } else {
          college = existingWithCode;
        }
      }

      collegeIdMap.set(code, college._id as Types.ObjectId);
      for (const alias of meta.aliases) {
        collegeIdMap.set(alias, college._id as Types.ObjectId);
      }
    }

    // 3. Clean all old JD Received records
    await DailyLead.deleteMany({ lead_type: 'jd_received' });

    // 4. Insert all clean JD Received leads into their respective colleges
    const leadsToInsert: any[] = [];
    for (const item of MASTER_JD_RECEIVED_DATA) {
      const collegeId = collegeIdMap.get(item.collegeCode.trim().toUpperCase());
      if (!collegeId) {
        console.warn(`⚠️ [Seed JD Received] Could not resolve college for code: ${item.collegeCode}`);
        continue;
      }

      const parts = item.date.split('-');
      const leadDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0));

      let companyMeta = null;
      try {
        const escaped = item.company.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        companyMeta = await CompanyMetadata.findOne({
          company_name: { $regex: `^${escaped}$`, $options: 'i' },
        });
      } catch (e) {
        // fallback
      }

      leadsToInsert.push({
        lead_type: 'jd_received',
        college_id: collegeId,
        coordinator_id: coordinatorId,
        company_id: companyMeta?._id || new Types.ObjectId(),
        company_name: item.company.trim(),
        job_role: item.role.trim(),
        ctc: item.ctc.trim(),
        eligible_batch: item.batch.trim() || '2027',
        event_time: item.time.trim(),
        lead_date: leadDate,
        remarks: '',
        is_moved_to_jd: true,
        is_finalized: true,
        is_deleted: false,
      });
    }

    if (leadsToInsert.length > 0) {
      await DailyLead.insertMany(leadsToInsert);
      console.log(`✅ [Seed JD Received] Successfully seeded ${leadsToInsert.length} clean JD Received leads across colleges.`);
    }

    return { success: true, count: leadsToInsert.length };
  } catch (err) {
    console.error('❌ [Seed JD Received] Error seeding JD Received:', err);
    throw err;
  }
}

if (require.main === module) {
  const { connectDatabase } = require('../config/database');
  connectDatabase().then(async () => {
    await seedAugustAllCollegesJdReceived();
    process.exit(0);
  });
}
