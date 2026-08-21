"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const nodemailer_1 = __importDefault(require("nodemailer"));
async function testSmtp() {
    const host = process.env.SMTP_HOST || 'smtp.office365.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const from = process.env.SMTP_FROM || `iPOMS Placement Operations <${user}>`;
    console.log('Testing SMTP connection with settings:');
    console.log('Host:', host);
    console.log('Port:', port);
    console.log('User:', user);
    console.log('Pass:', pass ? '****** (Provided)' : '(Empty)');
    console.log('From:', from);
    if (!user || !pass) {
        console.log('\n❌ USER or PASS is missing from environment variables!');
        process.exit(1);
    }
    const transporter = nodemailer_1.default.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false,
        },
    });
    try {
        console.log('\nVerifying SMTP credentials with server...');
        await transporter.verify();
        console.log('✅ SMTP Connection verified successfully!');
        console.log('\nSending test email to mohanaradha_a@infoziant.com...');
        const info = await transporter.sendMail({
            from,
            to: 'mohanaradha_a@infoziant.com',
            subject: 'iPOMS Test OTP Verification Code: 123456',
            text: 'This is a live test email from iPOMS SMTP delivery.',
        });
        console.log('🎉 Email sent successfully! MessageId:', info.messageId);
    }
    catch (err) {
        console.error('\n❌ SMTP Verification / Send Error:');
        console.error(err);
    }
    process.exit(0);
}
testSmtp();
