export interface CollegeEmailTemplate {
  fromEmail: string;
  subject: string;
  body: string;
  senderName: string;
  senderTitle: string;
  contactNumbers: string;
  websiteUrl: string;
}

export const COLLEGE_EMAIL_TEMPLATES: Record<string, CollegeEmailTemplate> = {
  ACET: {
    fromEmail: 'placementacet@achariya.org',
    subject: 'Invitation to Conduct Campus Placement Drive at ACET, Puducherry',
    senderName: 'Dr. G. Anand, B.Tech., M.Tech., Ph.D.',
    senderTitle: 'Associate Professor & Head (Mechanical Engineering)\nHEAD - Training & Placements (T&P)',
    contactNumbers: '9791541560 & 6383032498',
    websiteUrl: 'https://www.acet.edu.in/',
    body: `Dear Sir/Madam,
Warm greetings from Achariya College of Engineering Technology (ACET), Puducherry.

On behalf of ACET, I am pleased to invite your esteemed organization to collaborate with us by conducting a campus placement drive at our institution.

About ACET:
Achariya College of Engineering Technology, Puducherry, has been a leading institution for over 15 years, offering quality education in various engineering disciplines. Our students are trained with strong technical and problem-solving skills, making them well-prepared for today’s industry needs.

Benefits of Partnering with ACET:

Access to a pool of talented and skilled engineering graduates

Strengthening your brand presence among future professionals

Dedicated placement team ensuring smooth coordination and logistics

Disciplines Available for Recruitment:

Artificial Intelligence and Data Science

Computer Science and Engineering

Mechanical Engineering

Electrical and Electronics Engineering

Electronics and Communication Engineering

Civil Engineering

We would be honored to host your team on our campus and provide our students the opportunity to begin their careers with your esteemed organization.

We kindly request your confirmation and look forward to your positive response.

Thank you for considering our invitation.

Thanks & Regards
Dr. G. Anand, B.Tech.,  M.Tech., Ph.D.
Associate Professor & Head (Mechanical Engineering)
HEAD - Training & Placements (T&P)
Cell No.: 9791541560 & 6383032498
https://www.acet.edu.in/`,
  },
};

/**
 * Returns the customized email template for the given college code,
 * or a smart default template if not explicitly defined.
 */
export function getCollegeEmailTemplate(
  collegeCode?: string,
  collegeName?: string,
  hrName?: string,
  companyName?: string
): CollegeEmailTemplate {
  const cleanCode = (collegeCode || '').replace(/[\[\]]/g, '').toUpperCase().trim();
  const name = (collegeName || '').toLowerCase();

  if (COLLEGE_EMAIL_TEMPLATES[cleanCode]) {
    return { ...COLLEGE_EMAIL_TEMPLATES[cleanCode] };
  }

  // If college matches Achariya or ACET
  if (name.includes('achariya') || name.includes('acet') || cleanCode.includes('ACET')) {
    return { ...COLLEGE_EMAIL_TEMPLATES['ACET'] };
  }

  // Default to ACET template
  return { ...COLLEGE_EMAIL_TEMPLATES['ACET'] };
}
