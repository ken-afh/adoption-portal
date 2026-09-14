/**
 * Email template functions for the adoption portal.
 * Each function returns { subject, html } ready to pass to sendEmail().
 */

export interface EmailTemplate {
  subject: string;
  html: string;
}


// ─── Logo configuration ───────────────────────────────────────────────────────
// Once the AFH logo is hosted (e.g. on Firebase Hosting at /icons/afh-logo.png),
// set LOGO_URL to the full public URL, e.g.:
//   "https://adoption-portal.web.app/icons/afh-logo.png"
// The logo must be a PNG (not SVG) for maximum email client compatibility.
// Until then, the text-based header is used automatically.
const LOGO_URL: string | null = null; // TODO: set to hosted PNG URL after deploying


// ─── Shared layout wrapper ────────────────────────────────────────────────────

function layout(title: string, bodyHtml: string): string {
  const headerInner = LOGO_URL
    ? `<img src="${LOGO_URL}" alt="A Forever Home" width="120"
             style="display:block;max-width:120px;border:0;" />`
    : `<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">A Forever Home</h1>
            <p style="margin:4px 0 0;color:#c8e6c9;font-size:13px;">Dog Adoption Portal</p>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
  <tr>
    <td align="center" style="padding:24px 8px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;background-color:#ffffff;border-radius:6px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background-color:#2e7d32;padding:24px 32px;">
            ${headerInner}
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f9f9f9;border-top:1px solid #e0e0e0;
                     padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#9e9e9e;font-size:12px;">
              A Forever Home &bull; Dog Adoption Program<br />
              Please do not reply directly to this email.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function btn(url: string, text: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#2e7d32;border-radius:4px;padding:12px 24px;">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;color:#212121;font-size:15px;line-height:1.6;">${text}</p>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function submissionConfirmationEmail(
  applicantName: string,
  applicationId: string,
  appBaseUrl: string,
): EmailTemplate {
  const url = `${appBaseUrl}/applications/${applicationId}`;
  const body = `
    ${p(`Hi ${applicantName},`)}
    ${p(`Thank you for submitting your dog adoption application. We have received it and our team will review it shortly.`)}
    ${p(`Your application reference number is: <strong>${applicationId}</strong>`)}
    ${btn(url, 'View Your Application')}
    ${p(`If you have any questions, please contact us at <a href="mailto:info@aforeverhome.net" style="color:#2e7d32;">info@aforeverhome.net</a>.`)}
  `;
  return {
    subject: 'Your adoption application has been received',
    html: layout('Application Received', body),
  };
}

export function newSubmissionNotificationEmail(
  applicantName: string,
  submitterEmail: string,
  applicationId: string,
  appBaseUrl: string,
  resubmitCount: number,
): EmailTemplate {
  const url = `${appBaseUrl}/admin/applications/${applicationId}`;
  const resubmitNote =
    resubmitCount > 0
      ? p(`<strong>Note:</strong> This is resubmission #${resubmitCount} for this applicant.`)
      : '';
  const body = `
    ${p(`A new adoption application has been submitted and is ready for review.`)}
    <table cellpadding="0" cellspacing="0" border="0"
           style="width:100%;border:1px solid #e0e0e0;border-radius:4px;margin-bottom:16px;">
      <tr><td style="padding:12px 16px;background-color:#f9f9f9;border-bottom:1px solid #e0e0e0;">
        <strong style="color:#212121;font-size:14px;">Application Details</strong>
      </td></tr>
      <tr><td style="padding:12px 16px;">
        <p style="margin:0 0 8px;font-size:14px;color:#424242;">
          <strong>Applicant:</strong> ${applicantName}
        </p>
        <p style="margin:0 0 8px;font-size:14px;color:#424242;">
          <strong>Email:</strong> ${submitterEmail}
        </p>
        <p style="margin:0;font-size:14px;color:#424242;">
          <strong>Application ID:</strong> ${applicationId}
        </p>
      </td></tr>
    </table>
    ${resubmitNote}
    ${btn(url, 'Review Application')}
  `;
  return {
    subject: `New adoption application from ${applicantName}`,
    html: layout('New Application Submitted', body),
  };
}

export function clarificationRequestEmail(
  applicantName: string,
  applicationId: string,
  appBaseUrl: string,
  message: string,
): EmailTemplate {
  const url = `${appBaseUrl}/applications/${applicationId}`;
  const body = `
    ${p(`Hi ${applicantName},`)}
    ${p(`Our review team has reviewed your adoption application and has a question before we can continue.`)}
    <table cellpadding="0" cellspacing="0" border="0"
           style="width:100%;border-left:4px solid #f57c00;background-color:#fff8e1;
                  border-radius:0 4px 4px 0;margin-bottom:16px;">
      <tr><td style="padding:16px;">
        <p style="margin:0;font-size:15px;color:#424242;line-height:1.6;">${message}</p>
      </td></tr>
    </table>
    ${p(`Please log in to the portal and update your application with the requested information.`)}
    ${btn(url, 'Update Your Application')}
  `;
  return {
    subject: 'Action required: clarification needed for your adoption application',
    html: layout('Clarification Requested', body),
  };
}

export function clarificationReceivedEmail(
  applicantName: string,
  applicationId: string,
  appBaseUrl: string,
): EmailTemplate {
  const url = `${appBaseUrl}/admin/applications/${applicationId}`;
  const body = `
    ${p(`The applicant <strong>${applicantName}</strong> has responded to the clarification request on application <strong>${applicationId}</strong>.`)}
    ${p(`Their response is now available for review.`)}
    ${btn(url, 'Review Response')}
  `;
  return {
    subject: `Clarification received for application from ${applicantName}`,
    html: layout('Clarification Received', body),
  };
}

export function approvalEmail(
  applicantName: string,
  appBaseUrl: string,
): EmailTemplate {
  const body = `
    ${p(`Hi ${applicantName},`)}
    ${p(`Congratulations! We are thrilled to let you know that your dog adoption application has been <strong>approved</strong>.`)}
    ${p(`A member of our team will be in touch soon to discuss next steps and schedule your home visit.`)}
    ${btn(`${appBaseUrl}/applications`, 'View Your Application')}
    ${p(`Thank you for opening your heart and home to a dog in need.`)}
  `;
  return {
    subject: 'Congratulations — your adoption application has been approved!',
    html: layout('Application Approved', body),
  };
}

export function rejectionEmail(
  applicantName: string,
  applicationId: string,
  appBaseUrl: string,
  reason: string,
): EmailTemplate {
  const url = `${appBaseUrl}/applications/${applicationId}`;
  const body = `
    ${p(`Hi ${applicantName},`)}
    ${p(`Thank you for your interest in adopting through A Forever Home. After careful consideration, we are unable to approve your application at this time.`)}
    <table cellpadding="0" cellspacing="0" border="0"
           style="width:100%;border-left:4px solid #c62828;background-color:#ffebee;
                  border-radius:0 4px 4px 0;margin-bottom:16px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#c62828;">Reason</p>
        <p style="margin:0;font-size:15px;color:#424242;line-height:1.6;">${reason}</p>
      </td></tr>
    </table>
    ${p(`If you have questions about this decision, please contact us at <a href="mailto:info@aforeverhome.net" style="color:#2e7d32;">info@aforeverhome.net</a>.`)}
    ${btn(url, 'View Your Application')}
  `;
  return {
    subject: 'Update on your dog adoption application',
    html: layout('Application Decision', body),
  };
}

export function reviewerAssignedEmail(
  applicantName: string,
  applicationId: string,
  appBaseUrl: string,
): EmailTemplate {
  const url = `${appBaseUrl}/reviewer/applications/${applicationId}`;
  const body = `
    ${p(`You have been assigned to review a dog adoption application.`)}
    <table cellpadding="0" cellspacing="0" border="0"
           style="width:100%;border:1px solid #e0e0e0;border-radius:4px;margin-bottom:16px;">
      <tr><td style="padding:12px 16px;background-color:#f9f9f9;border-bottom:1px solid #e0e0e0;">
        <strong style="color:#212121;font-size:14px;">Assignment Details</strong>
      </td></tr>
      <tr><td style="padding:12px 16px;">
        <p style="margin:0 0 8px;font-size:14px;color:#424242;">
          <strong>Applicant:</strong> ${applicantName}
        </p>
        <p style="margin:0;font-size:14px;color:#424242;">
          <strong>Application ID:</strong> ${applicationId}
        </p>
      </td></tr>
    </table>
    ${btn(url, 'Start Review')}
  `;
  return {
    subject: `You have been assigned to review an adoption application`,
    html: layout('Reviewer Assignment', body),
  };
}

export function dataErasureNotificationEmail(
  displayName: string,
  email: string,
  applicationCount: number,
  appBaseUrl: string,
): EmailTemplate {
  const appNoun = applicationCount === 1 ? 'application' : 'applications';
  const body = `
    ${p(`A user has exercised their GDPR / CCPA right-to-erasure. Their account and all associated data have been <strong>permanently deleted</strong>.`)}
    <table cellpadding="0" cellspacing="0" border="0"
           style="width:100%;border:1px solid #e0e0e0;border-radius:4px;margin-bottom:16px;">
      <tr><td style="padding:12px 16px;background-color:#f9f9f9;border-bottom:1px solid #e0e0e0;">
        <strong style="color:#212121;font-size:14px;">Deleted Account</strong>
      </td></tr>
      <tr><td style="padding:12px 16px;">
        <p style="margin:0 0 8px;font-size:14px;color:#424242;">
          <strong>Name:</strong> ${displayName}
        </p>
        <p style="margin:0 0 8px;font-size:14px;color:#424242;">
          <strong>Email:</strong> ${email}
        </p>
        <p style="margin:0;font-size:14px;color:#424242;">
          <strong>Applications deleted:</strong> ${applicationCount} ${appNoun}
        </p>
      </td></tr>
    </table>
    ${p(`No further action is required. This notification is for your records.`)}
    ${btn(`${appBaseUrl}/admin`, 'Go to Admin Panel')}
  `;
  return {
    subject: `Data erasure completed for ${email}`,
    html: layout('Data Erasure Notification', body),
  };
}
