const { EMAIL_LOGO_CID } = require("./branding");

function layout({ title, accentColor, bodyHtml }) {
  const headerBrand = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:20px 24px;background:#ffffff;border-bottom:1px solid #e5e7eb;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:16px;">
        <img src="cid:${EMAIL_LOGO_CID}" alt="Government of Rwanda" width="64" height="64" style="display:block;border-radius:12px;" />
      </td>
      <td style="vertical-align:middle;">
        <div style="font-size:20px;font-weight:700;color:#111827;line-height:1.2;">Reception Management System</div>
        <div style="font-size:14px;color:#6b7280;margin-top:4px;">Government of Rwanda</div>
      </td>
    </tr></table>
  </td></tr></table>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1f2937;">
    <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">
        ${headerBrand}
        <div style="padding:24px 32px;background:${accentColor};color:#ffffff;">
          <div style="font-size:22px;font-weight:700;margin-bottom:8px;">${title}</div>
          <div style="font-size:14px;opacity:0.9;">Official notification from Reception Management System</div>
        </div>
        <div style="padding:32px;">
          ${bodyHtml}
        </div>
      </div>
      <div style="text-align:center;margin-top:24px;padding:20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
        <div style="font-size:14px;color:#64748b;margin-bottom:8px;">
          <strong>Reception Management System</strong>
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">
          Government of Rwanda
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:12px;">
          For inquiries: info@mininfra.gov.rw | +250 788387125/ 4287
        </div>
        <div style="font-size:11px;color:#cbd5e1;">
          This is an automated message. Please do not reply to this email.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function button({ href, label, bg }) {
  return `<a href="${href}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:${bg};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;text-align:center;min-width:120px;box-shadow:0 2px 4px rgba(0,0,0,0.1);transition:transform 0.2s ease;">${label}</a>`;
}

function acceptedEmail({ recipientName, service, statusUrl }) {
  const title = "Service Request Approved";
  const accentColor = "#059669";
  const bodyHtml = `
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 16px 0;font-size:16px;color:#1f2937;">Dear ${recipientName || "Valued Citizen"},</p>
      <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">
        We are pleased to inform you that your service request has been <strong style="color:#059669;">APPROVED</strong> and is now ready for processing.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #059669;padding:16px;margin:20px 0;border-radius:8px;">
        <div style="font-size:14px;color:#166534;margin-bottom:8px;"><strong>Service Details:</strong></div>
        <div style="font-size:16px;font-weight:600;color:#065f46;">${service}</div>
      </div>
    </div>
    <div style="margin:24px 0;text-align:center;">
      ${button({ href: statusUrl, label: "View Request Details", bg: "#059669" })}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:20px;border-radius:12px;margin:24px 0;">
      <div style="font-size:14px;color:#475569;margin-bottom:12px;"><strong>What happens next?</strong></div>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#64748b;line-height:1.6;">
        <li>Your request will be processed by the relevant department</li>
        <li>You will receive updates on the progress</li>
        <li>Final confirmation will be sent once completed</li>
      </ul>
    </div>
    <p style="margin:0;font-size:14px;color:#64748b;">
      If you have any questions or need assistance, please contact our reception desk at info@mininfra.gov.rw or call +250 788387125/ 4287.
    </p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">
      Thank you for using our services.<br>
      <strong>Reception Management System</strong><br>
      Government of Rwanda
    </p>
  `;
  return {
    subject: "Your Service Request Has Been Approved",
    html: layout({ title, accentColor, bodyHtml }),
  };
}

function rejectedEmail({ recipientName, service, statusUrl, submitAgainUrl }) {
  const title = "Service Request Not Approved";
  const accentColor = "#dc2626";
  const bodyHtml = `
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 16px 0;font-size:16px;color:#1f2937;">Dear ${recipientName || "Valued Citizen"},</p>
      <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">
        We regret to inform you that your service request has been <strong style="color:#dc2626;">NOT APPROVED</strong> at this time.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:20px 0;border-radius:8px;">
        <div style="font-size:14px;color:#991b1b;margin-bottom:8px;"><strong>Service Details:</strong></div>
        <div style="font-size:16px;font-weight:600;color:#7f1d1d;">${service}</div>
      </div>
    </div>
    <div style="margin:24px 0;text-align:center;">
      <div style="display:inline-block;margin-right:12px;">
        ${button({ href: statusUrl, label: "View Details", bg: "#dc2626" })}
      </div>
      <div style="display:inline-block;">
        ${button({ href: submitAgainUrl, label: "Submit New Request", bg: "#374151" })}
      </div>
    </div>
    <div style="background:#fefce8;border:1px solid #fde047;padding:20px;border-radius:12px;margin:24px 0;">
      <div style="font-size:14px;color:#92400e;margin-bottom:12px;"><strong>Important Information:</strong></div>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#78350f;line-height:1.6;">
        <li>You may submit a new request with updated information</li>
        <li>Please ensure all required documents are included</li>
        <li>Contact reception for guidance on requirements</li>
      </ul>
    </div>
    <p style="margin:0;font-size:14px;color:#64748b;">
      For assistance or to discuss your request, please contact our reception desk at info@mininfra.gov.rw or call +250 788387125/ 4287.
    </p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">
      We appreciate your understanding.<br>
      <strong>Reception Management System</strong><br>
      Government of Rwanda
    </p>
  `;
  return {
    subject: "Your Service Request Status Update",
    html: layout({ title, accentColor, bodyHtml }),
  };
}

function pendingEmail({ recipientName, service, statusUrl }) {
  const title = "Service Request Received";
  const accentColor = "#d97706";
  const bodyHtml = `
    <div style="margin-bottom:24px;">
      <p style="margin:0 0 16px 0;font-size:16px;color:#1f2937;">Dear ${recipientName || "Valued Citizen"},</p>
      <p style="margin:0 0 16px 0;font-size:15px;color:#374151;line-height:1.6;">
        Thank you for submitting your service request. We have received your application and it is currently being reviewed.
      </p>
      <div style="background:#fffbeb;border-left:4px solid #d97706;padding:16px;margin:20px 0;border-radius:8px;">
        <div style="font-size:14px;color:#92400e;margin-bottom:8px;"><strong>Service Requested:</strong></div>
        <div style="font-size:16px;font-weight:600;color:#78350f;">${service}</div>
        <div style="font-size:14px;color:#92400e;margin-top:8px;"><strong>Current Status:</strong> <span style="color:#d97706;font-weight:600;">UNDER REVIEW</span></div>
      </div>
    </div>
    <div style="margin:24px 0;text-align:center;">
      ${button({ href: statusUrl, label: "Track Your Request", bg: "#d97706" })}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:20px;border-radius:12px;margin:24px 0;">
      <div style="font-size:14px;color:#475569;margin-bottom:12px;"><strong>Processing Timeline:</strong></div>
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <div style="width:12px;height:12px;border-radius:50%;background:#d97706;margin-right:12px;flex-shrink:0;"></div>
        <span style="font-size:14px;color:#64748b;">Request received and acknowledged</span>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <div style="width:12px;height:12px;border-radius:50%;background:#e5e7eb;margin-right:12px;flex-shrink:0;"></div>
        <span style="font-size:14px;color:#94a3b8;">Under review by department</span>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <div style="width:12px;height:12px;border-radius:50%;background:#e5e7eb;margin-right:12px;flex-shrink:0;"></div>
        <span style="font-size:14px;color:#94a3b8;">Decision and notification</span>
      </div>
      <div style="display:flex;align-items:center;">
        <div style="width:12px;height:12px;border-radius:50%;background:#e5e7eb;margin-right:12px;flex-shrink:0;"></div>
        <span style="font-size:14px;color:#94a3b8;">Processing and completion</span>
      </div>
    </div>
    <p style="margin:0;font-size:14px;color:#64748b;">
      You will receive an email notification once your request is approved or if additional information is needed.
    </p>
    <p style="margin:16px 0 0 0;font-size:14px;color:#64748b;">
      For any inquiries, please contact info@mininfra.gov.rw or call +250 788387125/ 4287.<br>
      <strong>Reception Management System</strong><br>
      Government of Rwanda
    </p>
  `;
  return {
    subject: "Your Service Request Has Been Received",
    html: layout({ title, accentColor, bodyHtml }),
  };
}

module.exports = { acceptedEmail, rejectedEmail, pendingEmail };
