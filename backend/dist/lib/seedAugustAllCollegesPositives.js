"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUGUST_POSITIVES_DATA = void 0;
exports.seedAugustAllCollegesPositives = seedAugustAllCollegesPositives;
const mongoose_1 = require("mongoose");
const DailyLead_1 = require("../models/DailyLead");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
exports.AUGUST_POSITIVES_DATA = [
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
    { date: '2026-08-18', time: '11:31 PM', company: 'Photom Technologies', role: 'Mechanical Design Engineer', ctc: '3-4 LPA', batch: '2027', collegeCode: 'NEHRU' },
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
    // ── 08/24/2026 (Today) ─────────────────────────────────────────────────────
    { date: '2026-08-24', time: '04:12 PM', company: 'Kyungshin Industrial Motherson(KIML)', role: 'GET', ctc: '3 - 4 LPA', batch: '2027', collegeCode: 'KLU' },
    { date: '2026-08-24', time: '05:00 PM', company: 'Lawlytics', role: 'Tech Support Roles', ctc: '13 - 15 LPA', batch: '2027', collegeCode: 'KLU' },
    { date: '2026-08-24', time: '05:32 PM', company: 'DRIBLET PRIVATE LIMITED', role: 'Robotics Engineer', ctc: '4–5 LPA', batch: '2027', collegeCode: 'NPR' },
    { date: '2026-08-24', time: '02:40 PM', company: 'SSHRD GROUP', role: 'Techical trainer', ctc: '3 LPA', batch: '2027', collegeCode: 'NGCE' },
    { date: '2026-08-24', time: '03:18 PM', company: 'DEEPFACTS', role: 'Software Engineer', ctc: '3.7-4.1 LPA', batch: '2027', collegeCode: 'NGCE' },
];
const COLLEGE_META_MAP = {
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
};
async function seedAugustAllCollegesPositives() {
    try {
        console.log('🌱 [Seed August Positives] Starting segregation across all colleges...');
        // 1. Resolve coordinator
        const defaultCoordinator = (await User_1.User.findOne({ account_status: 'active', is_deleted: { $ne: true }, role_codes: 'PLACEMENT_COORDINATOR' })) ||
            (await User_1.User.findOne({ account_status: 'active', is_deleted: { $ne: true } })) ||
            (await User_1.User.findOne({ is_deleted: { $ne: true } })) ||
            (await User_1.User.findOne({}));
        const coordinatorId = defaultCoordinator ? defaultCoordinator._id : new mongoose_1.Types.ObjectId();
        // 2. Resolve/Upsert Colleges
        const collegeIdMap = new Map();
        for (const [code, meta] of Object.entries(COLLEGE_META_MAP)) {
            let college = await College_1.College.findOne({
                $or: [
                    { college_code: code },
                    { college_code: { $in: meta.aliases } },
                    { college_name: meta.name },
                ],
            });
            if (!college) {
                college = await College_1.College.create({
                    college_name: meta.name,
                    college_code: code,
                    location: meta.location,
                    departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
                    is_deleted: false,
                });
            }
            else if (college.college_code !== code) {
                const existingWithCode = await College_1.College.findOne({ college_code: code });
                if (!existingWithCode) {
                    college.college_code = code;
                    college.college_name = meta.name;
                    await college.save();
                }
                else {
                    college = existingWithCode;
                }
            }
            collegeIdMap.set(code, college._id);
            for (const alias of meta.aliases) {
                collegeIdMap.set(alias, college._id);
            }
        }
        // 3. Clear existing positive leads for August across these colleges and wipe any pre-August positives
        const allCollegeIds = Array.from(new Set(Array.from(collegeIdMap.values())));
        const augStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
        const augEnd = new Date(Date.UTC(2026, 7, 31, 23, 59, 59, 999));
        // Remove anything before August 2026 for all daily leads (positives and jd_received)
        await DailyLead_1.DailyLead.deleteMany({
            lead_date: { $lt: augStart },
        });
        // Clear August positives to prevent duplicates
        await DailyLead_1.DailyLead.deleteMany({
            lead_type: 'positive',
            lead_date: { $gte: augStart, $lte: augEnd },
        });
        // 4. Insert all August leads into their respective colleges
        let inserted = 0;
        for (const item of exports.AUGUST_POSITIVES_DATA) {
            const collegeId = collegeIdMap.get(item.collegeCode.trim().toUpperCase());
            if (!collegeId) {
                console.warn(`⚠️ [Seed August Positives] Could not resolve college for code: ${item.collegeCode}`);
                continue;
            }
            const parts = item.date.split('-');
            const leadDate = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0));
            let companyMeta = null;
            try {
                const escaped = item.company.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                companyMeta = await CompanyMetadata_1.CompanyMetadata.findOne({
                    company_name: { $regex: `^${escaped}$`, $options: 'i' },
                });
            }
            catch (e) {
                // fallback
            }
            await DailyLead_1.DailyLead.create({
                lead_type: 'positive',
                college_id: collegeId,
                coordinator_id: coordinatorId,
                company_id: companyMeta?._id || new mongoose_1.Types.ObjectId(),
                company_name: item.company.trim(),
                job_role: item.role.trim(),
                ctc: item.ctc.trim(),
                eligible_batch: item.batch.trim(),
                event_time: item.time.trim(),
                lead_date: leadDate,
                remarks: '',
                is_moved_to_jd: false,
                is_finalized: true,
                is_deleted: false,
            });
            inserted++;
        }
        console.log(`✅ [Seed August Positives] Successfully segregated and inserted ${inserted} positives across ${allCollegeIds.length} colleges.`);
    }
    catch (err) {
        console.error('❌ [Seed August Positives] Error seeding August positives:', err);
    }
}
if (require.main === module) {
    const { connectDatabase } = require('../config/database');
    connectDatabase().then(async () => {
        await seedAugustAllCollegesPositives();
        process.exit(0);
    });
}
