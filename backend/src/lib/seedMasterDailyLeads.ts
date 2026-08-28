import { Types } from 'mongoose';
import { DailyLead } from '../models/DailyLead';
import { College } from '../models/College';
import { User } from '../models/User';
import { CompanyMetadata } from '../models/CompanyMetadata';

export interface LeadSeedItem {
  date: string;
  time: string;
  company: string;
  role: string;
  ctc: string;
  batch: string;
  collegeCode: string;
}

export const MASTER_POSITIVES_DATA: LeadSeedItem[] = [
  // ── 07/07/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-07', time: '', company: 'Nutanix', role: 'Software Developer', ctc: '4-6 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-07-07', time: '', company: 'CDW', role: 'Network Engineer , System Consultant', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'KARPAGAM' },
  { date: '2026-07-07', time: '', company: 'Goat Robotics', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'MKCE' },
  { date: '2026-07-07', time: '', company: 'Adya.ai', role: 'Software Developer', ctc: '3 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-07-07', time: '', company: 'InCoBAN', role: 'Multiple Roles', ctc: '4 LPA', batch: '2025-2027', collegeCode: 'PSNA' },
  { date: '2026-07-07', time: '', company: 'MaxEye Technologies Private Limited', role: 'ASE', ctc: '4.5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-07', time: '', company: 'Eclerx', role: 'Visual Communication Intern', ctc: '3 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-07', time: '', company: 'UTS (Unistring)', role: 'Software / Hardware / Application Engineer', ctc: '5 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 07/08/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-08', time: '', company: 'Rishabh Enterprises', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-08', time: '', company: 'RexTech Studios', role: 'Software Developer', ctc: '4.5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-08', time: '', company: 'UTS (Unistring)', role: 'Software Engineer', ctc: '5 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-07-08', time: '', company: 'ZeAI Soft Pvt Ltd', role: 'AI & ML / Web Developer', ctc: '4-7 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-07-08', time: '', company: 'Colan Infotech', role: 'Software Developer', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-07-08', time: '', company: 'Perfint Healthcare Ltd', role: 'Junior Test & Software Engineer', ctc: '5.5 - 7.9 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-08', time: '', company: 'Titan Tech Emirates', role: 'Digital Marketing', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-08', time: '', company: 'Planys', role: 'Multiple roles for Mech, Civil &ECE, SCM.', ctc: '3.6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-08', time: '', company: 'Acheron', role: 'ASE', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-08', time: '', company: 'Advantech', role: 'Software Engineer Intern', ctc: '3 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-08', time: '', company: 'Avinya Infinity Solutions Pvt Ltd', role: 'Electrical Technical Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'SONA' },
  { date: '2026-07-08', time: '', company: 'Real Tech Systems', role: 'Technical Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'SONA' },
  { date: '2026-07-08', time: '', company: 'Intersect IQ', role: 'Software Engineer Intern', ctc: '3 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-07-08', time: '', company: 'H &MV Engineering', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'MKCE' },

  // ── 07/09/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-09', time: '', company: 'Magorix Pvt. Limited', role: 'Junior Developer', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-09', time: '', company: 'Amzetta Technologies', role: 'Software Developer', ctc: '4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-07-09', time: '', company: 'Value Labs', role: 'Associate Software Engineer', ctc: '3-4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-07-09', time: '', company: 'Sectigo', role: 'Technical Support Engineer', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-07-09', time: '', company: 'VOLVO', role: 'ASE', ctc: '5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-09', time: '', company: 'Magorix Pvt. Limited', role: 'Junior Developer', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-09', time: '', company: 'PTC', role: 'ASE', ctc: '3 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-09', time: '', company: 'Espint', role: 'Process Associate', ctc: '3 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-09', time: '', company: 'BDO', role: 'CA (Chartered Accountant)', ctc: '5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-09', time: '', company: 'Sagility India', role: 'Trainee Process Consultant, Customer Care Executive', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-09', time: '', company: 'Wavicle Data', role: 'Business Analyst', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-09', time: '', company: 'Pivotal', role: 'Software Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-07-09', time: '', company: 'Unistring(UTS)', role: 'Application Engineer', ctc: '5 -6 LPA', batch: '2027', collegeCode: 'MKCE' },
  { date: '2026-07-09', time: '', company: 'Bonfiglioli', role: 'Software Engineer', ctc: '5 LPA', batch: '2027', collegeCode: 'MKCE' },
  { date: '2026-07-09', time: '', company: 'Guidewire', role: 'Software Engineer', ctc: '6 LPA', batch: '2027', collegeCode: 'KARPAGAM' },
  { date: '2026-07-09', time: '', company: 'GridSync', role: 'Automation Engineer Intern', ctc: '3.5 LPA', batch: '2027', collegeCode: 'KARPAGAM' },
  { date: '2026-07-09', time: '', company: 'ZeAI Soft Private Limited', role: 'Web Developer', ctc: '4-5 LPA', batch: '2027', collegeCode: 'NPR' },

  // ── 07/10/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-10', time: '11:27 AM', company: 'Espint', role: 'Graduate Engineer Trainee', ctc: '3 LPA', batch: '2027', collegeCode: 'SONA' },
  { date: '2026-07-10', time: '11:31 AM', company: 'Mel Systems and Services Limited', role: 'Software Developer Intern', ctc: '3 LPA', batch: '2027', collegeCode: 'SONA' },
  { date: '2026-07-10', time: '11:38 AM', company: 'Vibrant Mind Technology', role: 'Trainee Software Developer', ctc: '6.18 LPA', batch: '2027', collegeCode: 'SONA' },
  { date: '2026-07-10', time: '12:06 PM', company: 'Prompt Cloud', role: 'Software Engineer, Data Engineer', ctc: '5.5 - 7.3 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-10', time: '01:38 PM', company: 'Flipr Innovation Labs', role: 'Software Engineer', ctc: '4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-10', time: '03:49 PM', company: 'EmbedUR Systems', role: 'Software Engineering, Trainee roles', ctc: '5 - 8 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-10', time: '02:12 PM', company: 'Qmax Systems', role: 'Intern / Embedded system Engineer/ Embedded Software', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-07-10', time: '02:19 PM', company: 'Unistring Tech Solutions', role: 'Software Engineer', ctc: '5 - 7 LPA', batch: '2027', collegeCode: 'KIOT' },

  // ── 07/13/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-13', time: '12:03 PM', company: 'Lyrostech', role: 'Customer Support, IT Roles', ctc: '3.7 - 5.6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-13', time: '03:44 PM', company: 'Sequellabs', role: 'Business Analytics Trainee, Trainee ETL Developer, Junior Python Developer', ctc: '3 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-13', time: '05:35 PM', company: 'Data Patterns', role: 'GET', ctc: '3.6 - 4.2 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-13', time: '03:32 PM', company: 'Guidewire', role: 'Software Developer', ctc: '5 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-07-13', time: '03:04 PM', company: 'Adarsha Control Systems Pvt Ltd', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-13', time: '03:11 PM', company: 'Sectigo', role: 'Technical Support Engineer', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-13', time: '03:18 PM', company: 'GridSync Services Pvt Ltd', role: 'Protection/Automation/Testing & Commissioning Engineer', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-13', time: '03:27 PM', company: 'Kriti Labs', role: 'Engineering Interns', ctc: '14k/month', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-13', time: '03:34 PM', company: 'EmbedUR Systems', role: 'Software Engineering/Trainee roles', ctc: '5 - 8 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-13', time: '03:46 PM', company: 'Qmax Systems', role: 'Embedded System/Software Engineer Intern', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-13', time: '03:58 PM', company: 'Juspay', role: 'Software Developer', ctc: '6-8 LPA', batch: '2027', collegeCode: 'KPR' },

  // ── 07/14/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-14', time: '11:38 AM', company: 'L&T Technology Services Limited (LTTS)', role: 'Embedded Software Engineer', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'SONA' },
  { date: '2026-07-14', time: '11:43 AM', company: 'Planys Technologies Pvt. Ltd.', role: 'Mechanical Design Engineer', ctc: '4.5 LPA', batch: '2027', collegeCode: 'SONA' },
  { date: '2026-07-14', time: '03:26 PM', company: 'Data Patterns', role: 'GET', ctc: '3.6 - 4.2 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-14', time: '12:08 PM', company: 'Intersectiq', role: 'Software Developer', ctc: '4.4 - 6.2 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-14', time: '12:41 PM', company: 'Lincoln Electric', role: 'GET', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-14', time: '04:13 PM', company: 'Presidio', role: 'ASE', ctc: '7.5 - 10.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-14', time: '06:35 PM', company: 'Harita Techserv', role: 'GET', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 07/15/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-15', time: '03:28 PM', company: 'Wavicle Data', role: 'Data Analyst', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'PSNA' },

  // ── 07/16/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-16', time: '01:27 PM', company: 'Conversight.ai', role: 'Devops / Product Engineer', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'MKCE' },
  { date: '2026-07-16', time: '03:10 PM', company: 'Magorix Pvt. Limited', role: 'Junior Developer', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-07-16', time: '01:05 PM', company: 'Goat Robotics', role: 'Purchase & Stores Assistants, Technical / Client Support Executives', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-16', time: '05:10 PM', company: 'V Max Health Tech', role: 'Multiple Roles', ctc: '4 - 5 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 07/17/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-17', time: '02:48 PM', company: 'AI Health Highway India Pvt. Ltd.', role: 'Software / AI Engineer', ctc: '4 – 8 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-17', time: '03:10 PM', company: 'Besmak Components Pvt. Ltd.', role: 'GET', ctc: '4 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-17', time: '03:15 PM', company: 'Gridsync Services Pvt Ltd', role: 'Testing & Commissioning Engineer, GET', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-17', time: '04:00 PM', company: 'India Japan Lightning Pvt Ltd', role: 'Technical Operator, Quality Inspector, Assembly Operator, GET', ctc: '4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-17', time: '03:54 PM', company: 'CDW', role: 'Network Engineer / Cloud Engineer', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-07-17', time: '04:15 PM', company: 'VOLVO', role: 'GET, Associate Engineer, Software Engineer', ctc: '5 - 7 LPA', batch: '2027', collegeCode: 'SMVEC' },

  // ── 07/20/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-20', time: '12:50 PM', company: 'Maximi', role: 'Junior Software Developer', ctc: '3.5 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-20', time: '01:13 PM', company: 'Craftsman Automation', role: 'GET', ctc: '5 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-20', time: '03:15 PM', company: 'Seimens', role: 'GET', ctc: '4 - 9 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-20', time: '04:36 PM', company: 'Boomi', role: 'ASE', ctc: '4 - 6.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-20', time: '06:30 PM', company: 'SiMax Systems', role: 'Junior Talent Acquisition Specialist', ctc: '4 - 5 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 07/21/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-21', time: '03:58 PM', company: 'Syrma SGS Technology Limited', role: 'GET', ctc: '4 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-07-21', time: '12:18 PM', company: 'Ericsson', role: 'Network Engineer / Integration Engineer', ctc: '5 - 7 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-07-21', time: '12:14 PM', company: 'Indium Software', role: 'SDE', ctc: '3 - 4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-21', time: '04:33 PM', company: 'Think41', role: 'Full Stack Engineer', ctc: '5 - 8 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 07/22/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-22', time: '04:50 PM', company: 'GridSync Services Private Limited', role: 'Automation Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-22', time: '04:25 PM', company: 'Presidio', role: 'Data Engineer / Cloud Engineer', ctc: '5 -7 LPA', batch: '2027', collegeCode: 'MKCE' },
  { date: '2026-07-22', time: '05:20 PM', company: 'Mitsogo', role: 'Software Engineer', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-07-22', time: '05:03 PM', company: 'Think41', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-22', time: '05:05 PM', company: 'Signify', role: 'Software Engineer', ctc: '8 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 07/23/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-23', time: '03:28 PM', company: 'GridSync Services Private Limited', role: 'Automation Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-07-23', time: '03:16 PM', company: 'Tredence', role: 'Analyst', ctc: '5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-23', time: '12:24 PM', company: 'Pepagora', role: 'Junior Software Engineer', ctc: '5 LPA', batch: '2027', collegeCode: 'NPR' },

  // ── 07/24/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-24', time: '03:43 PM', company: 'Think41', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-24', time: '01:15 PM', company: 'Qmax Systems', role: 'Embedded System/Software Engineer Intern', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'MKCE' },
  { date: '2026-07-24', time: '12:46 PM', company: 'Appstrail', role: 'Associate AI Engineer', ctc: '3 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-24', time: '01:48 PM', company: 'ZenAI Soft', role: 'Web Application Developer', ctc: '5-8 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-24', time: '03:14 PM', company: 'Seneca Global', role: 'Python Developer', ctc: '3.5 - 5.5 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 07/27/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-27', time: '12:40 PM', company: 'Devrev', role: 'SDE', ctc: '10 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-27', time: '03:15 PM', company: 'Finzly', role: 'Quality Analyst', ctc: '4 - 8 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 07/28/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-28', time: '05:24 PM', company: 'InCoban', role: 'Multiple Roles', ctc: '4 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-07-28', time: '04:20 PM', company: 'Robolog Automation', role: 'Junior Automation Engineer, Assembly Maintenance Technician', ctc: '4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-28', time: '05:05 PM', company: 'RNTBCI', role: 'GET', ctc: '4.25 - 4.75 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-28', time: '03:53 PM', company: 'Boomi', role: 'ASE', ctc: '4 - 6.5 LPA', batch: '2027', collegeCode: 'PSNA' },

  // ── 07/29/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-29', time: '04:17 PM', company: 'Congruent', role: 'AI engineer , SDE', ctc: '5-8 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-29', time: '01:08 PM', company: 'bhive technologies', role: 'AI Coder', ctc: '5 - 6.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-29', time: '02:14 PM', company: 'Gestamp', role: 'Production Engineer, Manufacturing Operator', ctc: '4 - 4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-29', time: '03:33 PM', company: 'ABB', role: 'GET, Management Trainee, Project Associate Engineer, Finance or Accounting Engineer', ctc: '4 - 7.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-29', time: '03:32 PM', company: 'CAD Macro Design & Solutions Private Limited', role: 'SDE', ctc: '3.5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-29', time: '03:38 PM', company: 'Care Edge', role: 'Software / AI Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-29', time: '04:00 PM', company: 'AquaAirX Private Limited', role: 'AI Interns', ctc: '15K/month', batch: '2027', collegeCode: 'PSNA' },

  // ── 07/30/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-30', time: '01:16 PM', company: 'Incoban', role: 'Design Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-30', time: '01:45 PM', company: 'DongAh Electric India Pvt. Ltd.', role: 'GET', ctc: '3.5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-30', time: '01:54 PM', company: 'Gestamp', role: 'Engineer Trainee', ctc: '3.8 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-30', time: '02:30 PM', company: 'Tazapay', role: 'ASE', ctc: '5 - 12 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-30', time: '03:55 PM', company: 'Voltech Group', role: 'Field Engineer (EEE)', ctc: '3-5 LPA', batch: '2027', collegeCode: 'ACET' },
  { date: '2026-07-30', time: '04:00 PM', company: 'Aero360', role: 'Multiple roles', ctc: '4 LPA', batch: '2027', collegeCode: 'ACET' },
  { date: '2026-07-30', time: '04:30 PM', company: 'CSCS', role: 'SDE', ctc: '6 LPA', batch: '2027', collegeCode: 'ACET' },
  { date: '2026-07-30', time: '04:40 PM', company: 'FristineTech', role: 'AI Engineer Intern', ctc: '3-5 LPA', batch: '2027', collegeCode: 'ACET' },
  { date: '2026-07-30', time: '05:30 PM', company: 'AI Health Highway India Pvt. Ltd.', role: 'SDE', ctc: '3.5 LPA', batch: '2027', collegeCode: 'ACET' },
  { date: '2026-07-30', time: '04:30 PM', company: 'CSCS', role: 'SDE', ctc: '6 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-30', time: '04:40 PM', company: 'FristineTech', role: 'AI Engineer Intern', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-30', time: '05:30 PM', company: 'AI Health Highway India Pvt. Ltd.', role: 'SDE', ctc: '3.5 LPA', batch: '2027', collegeCode: 'KPR' },
  { date: '2026-07-30', time: '04:57 PM', company: 'Datalogics India Pvt. Ltd.', role: 'Engineer Trainee', ctc: '3-5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-07-30', time: '05:14 PM', company: 'Colan infotech', role: 'Software Developer', ctc: '3-5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-07-30', time: '02:23 PM', company: 'Finzly', role: 'SDE', ctc: '4-5 LPA', batch: '2027', collegeCode: 'KIOT' },

  // ── 07/31/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-07-31', time: '02:30 PM', company: 'Aqua Air', role: 'Software Development Intern, Electrical & Embedded Systems Intern, Design Engineer, CAE Engineer', ctc: '3.5 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-31', time: '03:08 PM', company: 'Incoban', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-31', time: '04:26 PM', company: 'Voltech Group', role: 'Field Engineer (EEE)', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-31', time: '04:49 PM', company: 'RND Software', role: 'Junior Software Developer, Software Engineer', ctc: '3.5 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-07-31', time: '04:35 PM', company: 'Voltech Group', role: 'Field Engineer (EEE)', ctc: '3-5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-07-31', time: '04:30 PM', company: 'Amzetta Technologies', role: 'SDE', ctc: '3-5 LPA', batch: '2027', collegeCode: 'NPR' },

  // ── 08/03/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-03', time: '04:04 PM', company: 'Ramboll', role: 'Graduate Detailing Engineer', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-03', time: '04:23 PM', company: 'UBS Bglr', role: 'Financial Analyst, and Operations roles', ctc: '9.5 - 15.6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-03', time: '03:36 PM', company: 'Ramboll India Private Limited', role: 'GET', ctc: '6 LPA', batch: '2027', collegeCode: 'PSNA' },

  // ── 08/04/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-04', time: '05:00 PM', company: 'Changepond', role: 'Software Developer, Software Tester, Programmer Analyst Trainee, and Engineer Trainee', ctc: '4 - 5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-04', time: '05:25 PM', company: 'iNube solutions', role: 'Software Engineer, Software Engineer, Associate Business Analyst', ctc: '6 - 7 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-04', time: '12:30 PM', company: 'DongAh Electric India Pvt. Ltd.', role: 'GET', ctc: '3.5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-04', time: '04:13 PM', company: 'UBS Bglr', role: 'Financial Analyst, and Operations roles', ctc: '9.5 - 15.6 LPA', batch: '2027', collegeCode: 'PSNA' },

  // ── 08/05/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-05', time: '04:35 PM', company: 'FristineTech', role: 'AI Engineer Intern', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-05', time: '12:20 PM', company: 'Perfint Healthcare Ltd', role: 'Junior Test Engineer, Software Engineer', ctc: '5.5 - 7.9 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-05', time: '01:54 PM', company: 'bhive technologies', role: 'AI Coder', ctc: '5 - 6.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-05', time: '04:22 PM', company: 'Gestamp', role: 'Production Engineer, Manufacturing Operator', ctc: '3.5 - 4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-05', time: '05:00 PM', company: 'Kriti labs', role: 'Production / Soldering / Assembly, Project / Field Engineer, Junior / Fresher Java Developer, Layout Design / Specialized Trainee', ctc: '4 - 4.5 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 08/06/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-06', time: '01:30 PM', company: 'Visteon', role: 'Software Engineer', ctc: '6.5 - 7.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-06', time: '03:17 PM', company: 'Quark Global', role: 'Associate Software Engineer, Business Development / Operations, Trainee roles', ctc: '5.5 - 7.7 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-06', time: '04:52 PM', company: 'Espint', role: 'GET', ctc: '4 LPA', batch: '2027', collegeCode: 'PSNA' },

  // ── 08/07/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-07', time: '04:48 PM', company: 'Hunger Box', role: 'Tech Roles', ctc: '6 - 7 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-07', time: '12:56 PM', company: 'IOTA Diagnostic Pvt. Ltd', role: 'SDE', ctc: '3 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-07', time: '03:25 PM', company: 'Aero360', role: 'Multiple roles', ctc: '4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-07', time: '03:50 PM', company: 'CSCS', role: 'SDE', ctc: '6 LPA', batch: '2027', collegeCode: 'KIOT' },

  // ── 08/10/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-10', time: '11:50 AM', company: 'V max Health Tech', role: 'Multiple Roles', ctc: '4 - 5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-10', time: '01:11 PM', company: 'Fanucindia', role: 'GET', ctc: '5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-10', time: '03:45 PM', company: 'Voltech Events', role: 'Field Engineer (EEE)', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 08/11/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-11', time: '11:55 AM', company: 'Loyalty Juggernaut India Pvt. Ltd.', role: 'Software Engineer', ctc: '3-4 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-11', time: '03:46 PM', company: 'BIBUS India Private Limited', role: 'Design Engineer', ctc: '4 LPA', batch: '2026 & 2027', collegeCode: 'PSNA' },
  { date: '2026-08-11', time: '03:50 PM', company: 'Bigcat Wireless Private Limited', role: 'Embedded Software Engineer', ctc: '5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-11', time: '12:40 PM', company: 'iNube Solutions Pvt. Ltd.', role: 'Software Engineer', ctc: '4–6 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-08-11', time: '12:54 PM', company: 'V Max Health Tech Pvt. Ltd.', role: 'Software Engineer', ctc: '3–5 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-08-11', time: '01:43 PM', company: 'Axxelent', role: 'Multiple Roles', ctc: '3 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-11', time: '02:22 PM', company: 'ITSS Global', role: 'Junior Technical Consultant, Associate Technical Consultant, Software Developer / Junior Developer', ctc: '5 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-11', time: '04:21 PM', company: 'GE Vernova', role: 'SDE', ctc: '4-5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-11', time: '01:16 PM', company: 'iNube Solutions Pvt. Ltd.', role: 'Software Engineer', ctc: '4-5 LPA', batch: '2027', collegeCode: 'KIOT' },

  // ── 08/12/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-12', time: '01:41 PM', company: 'ShareSoft Technology', role: 'Web Developer', ctc: '3.5 - 4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-12', time: '03:48 PM', company: 'Cashfree', role: 'Associate Software Engineer', ctc: '9.5 - 10 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-12', time: '05:33 PM', company: 'MBit wireless', role: 'GET', ctc: '6 - 8 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-12', time: '11:41 AM', company: 'FORVIA FAURECIA', role: 'Graduate Engineer Trainee', ctc: '4–6 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-12', time: '11:49 AM', company: 'DRIBLET PRIVATE LIMITED', role: 'Robotics Engineer', ctc: '4–6 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-12', time: '11:51 AM', company: 'DSRL', role: 'Embedded Engineer', ctc: '3–5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-12', time: '11:55 AM', company: 'Eco Saathi Green India Private Limited', role: 'Data Analyst', ctc: '3–5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-12', time: '11:57 AM', company: 'Ecochoice Naturals Private Limited', role: 'Quality Analyst', ctc: '3–5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-12', time: '03:31 PM', company: 'Encamp Tourism Private Limited', role: 'Operations Executive', ctc: '3–5 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-08-12', time: '03:46 PM', company: 'GE Vernova', role: 'Graduate Engineer Trainee', ctc: '4–7 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-08-12', time: '04:04 PM', company: 'Loyalty Juggernaut', role: 'Software Engineer', ctc: '3-5 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-12', time: '03:21 PM', company: 'V Max Health Tech Pvt. Ltd.', role: 'Software Engineer', ctc: '3–5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-12', time: '04:04 PM', company: 'Aero360', role: 'Multiple roles', ctc: '4 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-12', time: '04:16 PM', company: 'FristineTech', role: 'AI Engineer Intern', ctc: '3-5 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-12', time: '04:24 PM', company: 'Ramboll India Private Limited', role: 'GET', ctc: '4-5 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-12', time: '04:36 PM', company: 'AquaAirX Private Limited', role: 'AI Interns', ctc: '15K/month', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-12', time: '04:53 PM', company: 'ITSS Global', role: 'Software Developer / Junior Developer', ctc: '4-5 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-12', time: '05:23 PM', company: 'Resnet Solutions', role: 'SDE', ctc: '3-5 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-12', time: '05:31 PM', company: 'VLSI Technology', role: 'Multiple Roles', ctc: '4-5 LPA', batch: '2027', collegeCode: 'AIHT' },

  // ── 08/13/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-13', time: '01:04 PM', company: 'Mitsogo - Hexnode', role: 'Associate Software Engineer', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-13', time: '01:25 PM', company: 'GE vernova', role: 'GET', ctc: '8 - 15 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-13', time: '03:01 PM', company: 'Jayam Autos', role: 'Assistant Engineer', ctc: '3 - 4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-13', time: '03:38 PM', company: 'L&T Tech', role: 'GET', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-13', time: '04:25 PM', company: 'Optum', role: 'Software Engineer', ctc: '11 - 16 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-13', time: '03:41 PM', company: 'FinanceKART (Renaissance)', role: 'Software Developer', ctc: '4–6 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-13', time: '04:08 PM', company: 'Explorica', role: 'GET', ctc: '3–5 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-08-13', time: '11:13 AM', company: 'BIBUS India Private Limited', role: 'Design Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-13', time: '11:25 AM', company: 'Bigcat Wireless Private Limited', role: 'Embedded Software Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-13', time: '01:11 PM', company: 'BIBUS India Private Limited', role: 'Design Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'KPR' },

  // ── 08/14/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-14', time: '11:10 AM', company: 'Mercedes Benz', role: 'GET', ctc: '11 - 14 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-14', time: '12:23 PM', company: 'Tiger Analytics', role: 'Associate Data Engineer', ctc: '6.5 - 7.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-14', time: '01:45 PM', company: 'Blue yonder', role: 'Associate Software Engineer', ctc: '10 - 12 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-14', time: '02:26 PM', company: 'Evobi', role: 'Android Developer', ctc: '6 -7 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-14', time: '03:48 PM', company: 'DSRL', role: 'Design Engineer', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-14', time: '05:21 PM', company: 'Eco Saathi Green India Private', role: 'Quality Analyst', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'KLU' },

  // ── 08/17/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-17', time: '12:35 PM', company: 'Crawl Corp India', role: 'AI Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-17', time: '12:56 PM', company: 'Modulus Housing', role: 'Architect Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-17', time: '01:30 PM', company: 'Agnitech Forge Pvt. Lmt.', role: 'CNC Machine Operator, Electrical Enginer', ctc: '2.8-3.5 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-17', time: '05:25 PM', company: 'AgentAnalytics.AI', role: 'Agentic AI engineer', ctc: '5-8 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-17', time: '05:35 PM', company: 'LLM APPLIANCES PRIVATE LIMITED', role: 'Production Trainerr (Mech)', ctc: '3.12 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-17', time: '05:55 PM', company: 'RunLoyal', role: 'Web Developer', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'AIHT' },
  { date: '2026-08-17', time: '01:02 PM', company: 'RunLoyal', role: 'Web Developer', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-17', time: '03:34 PM', company: 'Crawl Corp India', role: 'AI Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-17', time: '12:35 PM', company: 'Modulus Housing', role: 'Architect Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-17', time: '03:39 PM', company: 'PWC', role: 'GET', ctc: '4 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-17', time: '03:48 PM', company: 'Modulus Housing', role: 'Architect Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-17', time: '05:55 PM', company: 'Hunger Box', role: 'Multiple roles', ctc: '4-5 LPA', batch: '2027', collegeCode: 'ACEW' },
  { date: '2026-08-17', time: '05:06 PM', company: 'Cartrabbit', role: 'SEO Specialist / Analyst (MBA Graduates)', ctc: '4 - 5 LPA', batch: '2027', collegeCode: 'ACEW' },
  { date: '2026-08-17', time: '03:46 PM', company: 'Run Loyal', role: 'Software Developer', ctc: '5 - 6.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-17', time: '04:13 PM', company: 'Crawl Corp India', role: 'Flutter Developer', ctc: '4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-17', time: '04:58 PM', company: 'Modulus Housing', role: 'Structural Design Trainee', ctc: '4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-17', time: '05:15 PM', company: 'Crawl Corp India', role: 'AI Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-17', time: '05:26 PM', company: 'Modulus Housing', role: 'Architect Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-17', time: '05:35 PM', company: 'Hunger Box', role: 'Multiple roles', ctc: '4-5 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-17', time: '05:28 PM', company: 'RunLoyal', role: 'Web Developer', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-17', time: '05:31 PM', company: 'Modulus Housing', role: 'Architect Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-17', time: '05:37 PM', company: 'PWC', role: 'GET', ctc: '4 LPA', batch: '2027', collegeCode: 'NEHRU' },

  // ── 08/18/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-18', time: '12:26 PM', company: 'Crawl Corp India', role: 'Software Developer', ctc: '3–5 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-18', time: '03:18 PM', company: 'Innovease India Private Limited', role: 'Software Engineer', ctc: '3–5 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-08-18', time: '12:53 PM', company: 'Agnitech Forge Pvt. Ltd.', role: 'Data Analyst', ctc: '3–5 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-08-18', time: '01:14 PM', company: 'PWC', role: 'GET', ctc: '4 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-18', time: '02:21 PM', company: 'Agnitech Forge Pvt. Lmt.', role: 'Data Analyst', ctc: '3–5 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-18', time: '03:03 PM', company: 'AgentAnalytics.AI', role: 'AI/ML & Agentic Engineer', ctc: '4-6 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-18', time: '03:28 PM', company: 'Mercedes Benz', role: 'Test / Analytics Engineer', ctc: '9-10 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-18', time: '11:31 AM', company: 'Photom Technologies', role: 'Mechanical Design Engineer', ctc: '3-4 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-18', time: '12:17 PM', company: 'Eco Saathi Green India Private', role: 'Quality Analyst', ctc: '3–5 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-18', time: '12:28 PM', company: 'Explorica', role: 'GET', ctc: '3–5 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-18', time: '01:12 PM', company: 'AgentAnalytics.AI', role: 'AI/ML & Agentic Engineer', ctc: '4-6 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-18', time: '01:17 PM', company: 'Loyalty Juggernaut India Pvt. Ltd.', role: 'Software Engineer', ctc: '3-4 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-18', time: '01:57 PM', company: 'Agnitech Forge Pvt. Ltd.', role: 'Electrical Enginer', ctc: '3-4 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-18', time: '11:47 AM', company: 'Merlin Automation', role: 'Junior Design Engineer', ctc: '4 - 7 LPA', batch: '2027', collegeCode: 'NGCE' },
  { date: '2026-08-18', time: '02:26 PM', company: 'sasken', role: 'Software Engineer', ctc: '5 LPA', batch: '2027', collegeCode: 'NGCE' },

  // ── 08/19/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-19', time: '04:40 PM', company: 'RunLoyal', role: 'Web Developer', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'SMVEC' },
  { date: '2026-08-19', time: '05:26 PM', company: 'Agnitech Forge Pvt. Ltd.', role: 'Electrical Enginer', ctc: '3-4 LPA', batch: '2027', collegeCode: 'KIOT' },
  { date: '2026-08-19', time: '05:20 PM', company: 'AgentAnalytics.AI', role: 'AI/ML & Agentic Engineer', ctc: '4-5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-19', time: '03:36 PM', company: 'Avinya Infinity Solutions Pvt Ltd', role: 'Technical Support, Hardware Assembly, Product Design Roles', ctc: '3.5 - 4 LPA', batch: '2027', collegeCode: 'NGCE' },
  { date: '2026-08-19', time: '04:48 PM', company: 'BIBUS India', role: 'Junior Internal Support, Executive Accountant / Operations', ctc: '4 LPA', batch: '2027', collegeCode: 'NGCE' },
  { date: '2026-08-19', time: '12:15 PM', company: 'Flipr', role: 'Software Engineer', ctc: '4.5 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-19', time: '01:16 PM', company: 'Planys', role: 'Multiple roles for Mech&ECE, SCM, Civil Engineering', ctc: '3.6 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-19', time: '11:16 AM', company: 'Kinaxis', role: 'Software Engineer Trainee', ctc: '6 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-19', time: '12:22 PM', company: 'Hashiraworks', role: 'Software Developer', ctc: '10 - 12 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-19', time: '02:14 PM', company: 'Valeo', role: 'Graduate Engineer Trainee', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-19', time: '03:10 PM', company: 'Care Edge', role: 'Software / AI Engineer', ctc: '3 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-19', time: '03:17 PM', company: 'Colan Infotech', role: 'Software Developer', ctc: '4 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-19', time: '11:22 AM', company: 'Sasken', role: 'Software Engineer', ctc: '5 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-19', time: '12:26 PM', company: 'Merlin Automation', role: 'Junior Design Engineer', ctc: '4 - 7 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-19', time: '12:45 PM', company: 'Evobi', role: 'Android Developer', ctc: '6 -7 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-19', time: '03:22 PM', company: 'Tiger Analytics', role: 'Multiple IT Roles', ctc: '6 - 8 LPA', batch: '2027', collegeCode: 'NEHRU' },

  // ── 08/20/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-20', time: '12:15 PM', company: 'Brakes India', role: 'GET', ctc: '15k/month - Intern, 3.80 - 5.82 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-20', time: '12:45 PM', company: 'Rishabh Enterprises', role: 'GET', ctc: '3-4 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-20', time: '04:15 PM', company: 'Planys Tech', role: 'Mechanical, Electrical & Manufacturing Intern', ctc: '15k/month', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-20', time: '02:11 PM', company: 'DSRL', role: 'Embedded Engineer', ctc: '3 - 5 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-20', time: '02:46 PM', company: 'Driblet Pvt Ltd', role: 'Robotics Engineer', ctc: '4 - 6 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-20', time: '03:10 PM', company: 'Agnitech Forge Pvt. Lmt.', role: 'Data Analyst', ctc: '3–5 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-20', time: '04:30 PM', company: 'Crawl Corp India', role: 'AI Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-20', time: '05:36 PM', company: 'Flipr Innovation Labs', role: 'Software Engineer', ctc: '4.5 LPA', batch: '2027', collegeCode: 'NEHRU' },

  // ── 08/24/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-24', time: '04:12 PM', company: 'Kyungshin Industrial Motherson(KIML)', role: 'GET', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-24', time: '05:00 PM', company: 'Lawlytics', role: 'Tech Support Roles', ctc: '13 - 15 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-24', time: '05:32 PM', company: 'DRIBLET PRIVATE LIMITED', role: 'Robotics Engineer', ctc: '4–5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-24', time: '02:40 PM', company: 'SSHRD GROUP', role: 'Techical trainer', ctc: '3 LPA', batch: '2027', collegeCode: 'NGCE' },
  { date: '2026-08-24', time: '03:18 PM', company: 'DEEPFACTS', role: 'Software Engineer', ctc: '3.7-4.1 LPA', batch: '2027', collegeCode: 'NGCE' },

  // ── 08/25/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-25', time: '03:02 PM', company: 'Lincoln Electric', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-08-25', time: '03:17 PM', company: 'Sew-Eurodrive India Pvt Ltd', role: 'GET', ctc: '4 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-08-25', time: '02:37 PM', company: 'Belzabar Software', role: 'SOFTWARE DEVELOPER INTERN', ctc: '7 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-08-25', time: '04:15 PM', company: 'PHILIPS', role: 'Multiple Roles', ctc: '4-10 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-08-25', time: '04:06 PM', company: 'Think41', role: 'GET', ctc: '3 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-25', time: '12:24 PM', company: 'Crawl Corp India', role: 'AI Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'ACEW' },
  { date: '2026-08-25', time: '12:27 PM', company: 'BIBUS India Private Limited', role: 'Design Engineer', ctc: '4 LPA', batch: '2027', collegeCode: 'ACEW' },
  { date: '2026-08-25', time: '12:31 PM', company: 'VLSI Technology', role: 'Multiple Roles', ctc: '4-5 LPA', batch: '2027', collegeCode: 'ACEW' },
  { date: '2026-08-25', time: '04:00 PM', company: 'IQOL Technologies Pvt. Ltd', role: 'BDO, Operations Executives', ctc: '4 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-25', time: '04:36 PM', company: 'Axxela', role: 'Multiple IT Roles', ctc: '12 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-25', time: '05:10 PM', company: 'Value Creed', role: 'Procurement Operations Associate', ctc: '8.2 LPA', batch: '2027', collegeCode: 'KLU' },
  { date: '2026-08-25', time: '12:45 PM', company: 'Lawlytics', role: 'Tech Support Roles', ctc: '13 - 15 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-25', time: '03:11 PM', company: 'DeepFacts Pvt Ltd', role: 'Software Engineer', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'HITS' },
  { date: '2026-08-25', time: '02:22 PM', company: 'Loyal Wingman', role: 'Graduate Engineer Trainee', ctc: '3 LPA', batch: '2027', collegeCode: 'NEHRU' },
  { date: '2026-08-25', time: '03:45 PM', company: 'Planys Technologies', role: 'Multiple Intern Roles', ctc: '15k/month - Intern', batch: '2027', collegeCode: 'NEHRU' },

  // ── 08/27/2026 ─────────────────────────────────────────────────────────────
  { date: '2026-08-27', time: '12:57 PM', company: 'Innowaft', role: 'SDE', ctc: '3 LPA', batch: '2027', collegeCode: 'PSNA' },
  { date: '2026-08-27', time: '11:20 AM', company: 'Renault Group', role: 'DATA ENGINEER', ctc: '6.6 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-08-27', time: '01:45 PM', company: 'Think41', role: 'FULL STACK DEVELOPER', ctc: '6 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-08-27', time: '01:35 PM', company: 'Axxela', role: 'MULTIPLE ROLES', ctc: '5-10 LPA', batch: '2027', collegeCode: 'KAMARAJ' },
  { date: '2026-08-27', time: '03:33 PM', company: 'Lincoln Electric', role: 'JUNIOR ENGINEER', ctc: '3 LPA', batch: '2027', collegeCode: 'NGP' },
  { date: '2026-08-27', time: '03:40 PM', company: 'Axxela', role: 'MULTIPLE ROLES', ctc: '5-10 LPA', batch: '2027', collegeCode: 'NGP' },
  { date: '2026-08-27', time: '11:43 AM', company: 'VLSI Technology', role: 'Multiple Roles', ctc: '4-5 LPA', batch: '2027', collegeCode: 'NPR' },
  { date: '2026-08-27', time: '05:15 PM', company: 'Axxela', role: 'Multiple IT Roles', ctc: '12 LPA', batch: '2027', collegeCode: 'DSU' },
  { date: '2026-08-27', time: '05:13 PM', company: 'Glenwood System', role: 'Software Developer', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'ACEW' },
  { date: '2026-08-27', time: '03:45 PM', company: 'Namekart', role: 'SDE', ctc: '4 LPA', batch: '2027', collegeCode: 'KLU' },
];

export const COLLEGE_META_MAP: Record<string, { name: string; location: string; aliases: string[] }> = {
  PSNA: { name: 'PSNA College of Engineering and Technology', location: 'Dindigul, Tamil Nadu', aliases: ['PSNA'] },
  NPR: { name: 'NPR College of Engineering & Technology', location: 'Natham / Dindigul, Tamil Nadu', aliases: ['NPR'] },
  KIOT: { name: 'Knowledge Institute of Technology', location: 'Salem, Tamil Nadu', aliases: ['KIOT'] },
  SMVEC: { name: 'Sri Manakula Vinayagar Engineering College', location: 'Puducherry', aliases: ['SMVEC'] },
  DSU: { name: 'Dhanalakshmi Srinivasan University', location: 'Perambalur / Trichy, Tamil Nadu', aliases: ['DSU'] },
  AIHT: { name: 'Anand Institute of Higher Technology', location: 'Chennai, Tamil Nadu', aliases: ['AIHT', 'AHID'] },
  KPR: { name: 'KPR Institute of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['KPR'] },
  ACEW: { name: 'Annai College of Engineering for Women', location: 'Kanyakumari, Tamil Nadu', aliases: ['ACEW'] },
  HITS: { name: 'Hindustan Institute of Technology and Science', location: 'Chennai, Tamil Nadu', aliases: ['HITS'] },
  NEHRU: { name: 'Nehru Institute of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['NEHRU'] },
  NGCE: { name: 'Narayana Guru College of Engineering', location: 'Kanyakumari / Coimbatore, Tamil Nadu', aliases: ['NGCE', 'NGC'] },
  KLU: { name: 'Kalasalingam Academy of Research and Education', location: 'Virudhunagar, Tamil Nadu', aliases: ['KLU'] },
  KAMARAJ: { name: 'Kamaraj College of Engineering and Technology', location: 'Virudhunagar, Tamil Nadu', aliases: ['KAMARAJ', 'KCET'] },
  KARPAGAM: { name: 'Karpagam College of Engineering', location: 'Coimbatore, Tamil Nadu', aliases: ['KARPAGAM', 'KCE'] },
  MKCE: { name: 'M. Kumarasamy College of Engineering', location: 'Karur, Tamil Nadu', aliases: ['MKCE'] },
  SONA: { name: 'Sona College of Technology', location: 'Salem, Tamil Nadu', aliases: ['SONA'] },
  ACET: { name: 'Akshaya College of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['ACET'] },
  NGP: { name: 'Dr. N.G.P. Institute of Technology', location: 'Coimbatore, Tamil Nadu', aliases: ['NGP', 'DRNGP'] },
};

export async function seedMasterDailyLeads() {
  try {
    console.log('🌱 [Seed Master Daily Leads] Starting fresh update of all positives & JD received...');

    // 1. Resolve coordinator
    const defaultCoordinator =
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true }, role_codes: 'PLACEMENT_COORDINATOR' })) ||
      (await User.findOne({ account_status: 'active', is_deleted: { $ne: true } })) ||
      (await User.findOne({ is_deleted: { $ne: true } })) ||
      (await User.findOne({}));

    const coordinatorId = defaultCoordinator ? defaultCoordinator._id : new Types.ObjectId();

    // 2. Resolve / Upsert Colleges
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

    // 3. Delete existing positive leads to ensure completely fresh & accurate dataset
    await DailyLead.deleteMany({ lead_type: 'positive' });
    console.log('🗑️  Cleared old DailyLead positives.');

    // 4. Insert master verified positive leads
    const leadsToInsert = [];

    for (const item of MASTER_POSITIVES_DATA) {
      const collegeId = collegeIdMap.get(item.collegeCode.toUpperCase());
      if (!collegeId) {
        console.warn(`⚠️ College code ${item.collegeCode} not found in map, skipping item:`, item.company);
        continue;
      }

      // Parse date
      const [year, month, day] = item.date.split('-').map(Number);
      const leadDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      // Resolve Company in Metadata if exists
      const existingMeta = await CompanyMetadata.findOne({
        company_name: { $regex: `^${item.company.trim()}$`, $options: 'i' },
      });

      leadsToInsert.push({
        lead_type: 'positive',
        college_id: collegeId,
        coordinator_id: coordinatorId,
        company_id: existingMeta?._id || null,
        company_name: item.company.trim(),
        job_role: item.role.trim() || 'Graduate Trainee',
        ctc: item.ctc.trim() || '',
        eligible_batch: item.batch.trim() || '2027',
        event_time: item.time.trim() || '',
        lead_date: leadDate,
        remarks: 'Direct call positive response',
        is_deleted: false,
      });
    }

    if (leadsToInsert.length > 0) {
      await DailyLead.insertMany(leadsToInsert);
      console.log(`✅ Successfully seeded ${leadsToInsert.length} master positive leads across ${collegeIdMap.size} colleges!`);
    }

    return { success: true, count: leadsToInsert.length };
  } catch (error) {
    console.error('❌ [Seed Master Daily Leads] Failed:', error);
    throw error;
  }
}
