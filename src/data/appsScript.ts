export interface BackendScriptOptions {
  ownerEmail: string;
  adminDashboardUrl: string;
  spreadsheetTitle?: string;
  cvFolderName?: string;
}

export function buildZoZoBackendScript(options: BackendScriptOptions): string {
  const ownerEmail = (options.ownerEmail || 'liongroupdv@gmail.com').trim();
  const adminDashboardUrl = options.adminDashboardUrl.trim();
  const spreadsheetTitle =
    options.spreadsheetTitle?.trim() || 'ZoZo Live – Global Recruitment Database';
  const cvFolderName = options.cvFolderName?.trim() || 'ZoZo Live – Private Applicant CVs';

  return `/**
 * ZoZo Live – Complete Google Apps Script Backend & Private Google Sheets Database
 * ---------------------------------------------------------------------------------
 * Runs securely under your Google Account (${ownerEmail}).
 * - Creates a PRIVATE Google Spreadsheet with 13 structured columns & role-filtered tabs.
 * - Stores internal Application IDs strictly for management inside Google Sheets & Admin.
 * - Creates a PRIVATE Google Drive folder for PDF / DOC / DOCX CV uploads (no applicant sign-in).
 * - Exposes a Web App endpoint (doPost) with position-based server validation, duplicate
 *   prevention, safe MailApp instant email alerts, and OAuth-verified Admin CRUD + RBAC.
 * - Never exposes private spreadsheet data on public GET requests.
 *
 * SETUP & DEPLOYMENT STEPS:
 * 1. Open https://script.google.com -> New Project -> paste this code into Code.gs and Save.
 * 2. Run "setupZoZoRecruitmentDatabase" once and grant Google Drive, Sheets & Mail permissions.
 * 3. Check Execution Log for your PRIVATE Google Spreadsheet URL and Private CV Folder URL.
 * 4. Click Deploy -> New deployment -> Select type: Web app.
 *    - Execute as: Me (${ownerEmail})
 *    - Who has access: Anyone
 * 5. Copy the Web App URL and paste it in the ZoZo Live Admin Dashboard -> Apps Script & Sheets.
 */

var OWNER_EMAIL = ${JSON.stringify(ownerEmail)};
var ADMIN_DASHBOARD_URL = ${JSON.stringify(adminDashboardUrl)};
var SPREADSHEET_TITLE = ${JSON.stringify(spreadsheetTitle)};
var CV_FOLDER_NAME = ${JSON.stringify(cvFolderName)};
var MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB

var SHEET_HEADERS = [
  'Application ID (Internal)',
  'Submission Date & Time',
  'Full Name',
  'Country',
  'WhatsApp Number',
  'Applied Position',
  'Currently Working Live App',
  'Number of Admins',
  'Number of Agencies',
  'Coin Selling Package',
  'Work / Coin Selling Experience',
  'CV File Link',
  'Application Status'
];

var VALID_POSITIONS = ['Super Admin', 'Admin', 'Coin Seller'];
var VALID_STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected'];
var VALID_COIN_PACKAGES = ['$500', '$800', '$1,000'];

/**
 * Step 1: One-time setup to create the private Google Spreadsheet and private CV Drive folder.
 */
function setupZoZoRecruitmentDatabase() {
  var props = PropertiesService.getScriptProperties();

  // 1. Create or open private Google Spreadsheet
  var spreadsheetId = props.getProperty('SPREADSHEET_ID');
  var ss;
  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      ss = null;
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SPREADSHEET_TITLE);
    spreadsheetId = ss.getId();
    props.setProperty('SPREADSHEET_ID', spreadsheetId);
  }

  // Enforce strict PRIVATE sharing on Spreadsheet
  var ssFile = DriveApp.getFileById(spreadsheetId);
  ssFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  // Format main Applications tab
  var mainSheet = ss.getSheets()[0];
  mainSheet.setName('Applications');
  mainSheet.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
  mainSheet.getRange(1, 1, 1, SHEET_HEADERS.length)
    .setBackground('#312E81')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  mainSheet.setFrozenRows(1);

  // Create or update filtered position tabs
  var roles = ['Super Admin', 'Admin', 'Coin Seller'];
  for (var i = 0; i < roles.length; i++) {
    var roleName = roles[i];
    var tab = ss.getSheetByName(roleName);
    if (!tab) {
      tab = ss.insertSheet(roleName);
    }
    tab.getRange(1, 1, 1, SHEET_HEADERS.length).setValues([SHEET_HEADERS]);
    tab.getRange(1, 1, 1, SHEET_HEADERS.length)
      .setBackground(i === 0 ? '#5B21B6' : i === 1 ? '#1D4ED8' : '#0E7490')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    tab.setFrozenRows(1);
    tab.getRange(2, 1).setFormula(
      '=IFERROR(FILTER(Applications!A2:M, Applications!F2:F="' + roleName + '"), "No ' + roleName + ' applications yet")'
    );
  }

  // 2. Create or open Private Drive Folder for Applicant CVs
  var folderId = props.getProperty('CV_FOLDER_ID');
  var folder = null;
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      folder = null;
    }
  }
  if (!folder) {
    folder = DriveApp.createFolder(CV_FOLDER_NAME);
    folderId = folder.getId();
    props.setProperty('CV_FOLDER_ID', folderId);
  }
  folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  // Ensure default Admin Access list exists
  if (!props.getProperty('ADMIN_ACCESS_JSON')) {
    props.setProperty('ADMIN_ACCESS_JSON', JSON.stringify([
      {
        email: OWNER_EMAIL.toLowerCase(),
        role: 'Owner',
        canDelete: true,
        grantedAt: new Date().toISOString(),
        grantedBy: OWNER_EMAIL.toLowerCase()
      }
    ]));
  }

  Logger.log('===============================================================');
  Logger.log('ZoZo Live Recruitment Database Setup Complete!');
  Logger.log('Private Google Spreadsheet URL : ' + ss.getUrl());
  Logger.log('Private Google Drive CV Folder : ' + folder.getUrl());
  Logger.log('Spreadsheet ID                 : ' + spreadsheetId);
  Logger.log('CV Folder ID                   : ' + folderId);
  Logger.log('===============================================================');

  return {
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: ss.getUrl(),
    cvFolderId: folderId,
    cvFolderUrl: folder.getUrl()
  };
}

/**
 * Public GET health check only. Never returns private spreadsheet rows.
 */
function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'ZoZo Live Recruitment Backend',
    ownerEmail: OWNER_EMAIL,
    spreadsheetPrivate: true
  });
}

/**
 * Unified POST endpoint for:
 * - Public Application Submissions (no applicant login required)
 * - Authenticated Admin Dashboard operations (OAuth Bearer token verified via Google)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: 'Empty request payload.' });
    }

    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'submitApplication';

    if (action === 'submitApplication') {
      return handleSubmitApplication_(body);
    }

    // All admin actions require a valid Google OAuth accessToken
    var authUser = verifyGoogleAccessToken_(body.accessToken);
    if (!authUser) {
      return jsonResponse_({ ok: false, status: 401, error: 'Unauthorized: Sign in with an authorized Google account.' });
    }

    var perm = getAdminPermission_(authUser.email);
    if (!perm) {
      return jsonResponse_({ ok: false, status: 403, error: 'Access Denied: ' + authUser.email + ' is not an authorized administrator.' });
    }

    if (action === 'adminPing') {
      var refs = ensureDbHandles_();
      return jsonResponse_({
        ok: true,
        email: authUser.email,
        role: perm.role,
        canDelete: Boolean(perm.canDelete),
        spreadsheetUrl: refs.spreadsheet.getUrl(),
        cvFolderUrl: refs.folder.getUrl()
      });
    }

    if (action === 'adminList') {
      return handleAdminList_();
    }

    if (action === 'adminUpdate') {
      if (perm.role === 'Viewer') {
        return jsonResponse_({ ok: false, status: 403, error: 'Viewer access is read-only.' });
      }
      return handleAdminUpdate_(body);
    }

    if (action === 'adminDelete') {
      var allowedToDelete = perm.role === 'Owner' || (perm.role === 'Editor' && perm.canDelete === true);
      if (!allowedToDelete) {
        return jsonResponse_({ ok: false, status: 403, error: 'Delete requires Owner authorization.' });
      }
      return handleAdminDelete_(body.applicationId);
    }

    if (action === 'adminManageAccess') {
      if (perm.role !== 'Owner') {
        return jsonResponse_({ ok: false, status: 403, error: 'Only the primary Owner can manage administrator permissions.' });
      }
      return handleAdminManageAccess_(body);
    }

    return jsonResponse_({ ok: false, error: 'Unsupported action.' });
  } catch (err) {
    return jsonResponse_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function handleSubmitApplication_(data) {
  // Duplicate submission guard
  var cache = CacheService.getScriptCache();
  var subToken = String(data.submissionToken || '').trim();
  if (subToken) {
    if (cache.get('sub_' + subToken)) {
      return jsonResponse_({ ok: false, status: 409, error: 'Duplicate submission blocked.' });
    }
    cache.put('sub_' + subToken, '1', 300);
  }

  // Server-side validation (no email collected from applicant)
  var name = String(data.name || '').trim();
  var country = String(data.country || '').trim();
  var whatsapp = String(data.whatsapp || '').trim();
  var position = String(data.position || '').trim();
  var currentApp = String(data.currentApp || '').trim();
  var workExperience = String(data.workExperience || '').trim();
  var language = data.language === 'bn' ? 'bn' : 'en';

  var adminsCount = data.adminsCount !== undefined && data.adminsCount !== '' ? Number(data.adminsCount) : '';
  var agenciesCount = data.agenciesCount !== undefined && data.agenciesCount !== '' ? Number(data.agenciesCount) : '';
  var coinPackage = data.coinPackage ? String(data.coinPackage).trim() : '';

  if (!name) throw new Error('Full Name is required.');
  if (!country) throw new Error('Country is required.');
  if (!/^[+]?[0-9][0-9\\s\\-()]{5,22}$/.test(whatsapp)) throw new Error('Valid WhatsApp number is required.');
  if (VALID_POSITIONS.indexOf(position) === -1) throw new Error('Invalid position.');
  if (!currentApp) throw new Error('Currently Working Live App is required.');
  if (!workExperience) throw new Error('Experience description is required.');

  if (position === 'Super Admin') {
    if (adminsCount === '' || isNaN(adminsCount) || adminsCount < 0 || Math.floor(adminsCount) !== adminsCount) {
      throw new Error('Number of Admins must be a whole number (0 or higher).');
    }
    if (agenciesCount === '' || isNaN(agenciesCount) || agenciesCount < 0 || Math.floor(agenciesCount) !== agenciesCount) {
      throw new Error('Number of Agencies must be a whole number (0 or higher).');
    }
    coinPackage = '';
  } else if (position === 'Admin') {
    if (agenciesCount === '' || isNaN(agenciesCount) || agenciesCount < 0 || Math.floor(agenciesCount) !== agenciesCount) {
      throw new Error('Number of Agencies must be a whole number (0 or higher).');
    }
    adminsCount = '';
    coinPackage = '';
  } else if (position === 'Coin Seller') {
    if (VALID_COIN_PACKAGES.indexOf(coinPackage) === -1) {
      throw new Error('Select a valid coin-selling package ($500, $800, or $1,000).');
    }
    adminsCount = '';
    agenciesCount = '';
  }

  var refs = ensureDbHandles_();
  var appId = String(data.id || '').trim() || generateApplicationId_();
  var submittedAt = String(data.submittedAt || '').trim() || new Date().toISOString();

  // Handle Private Google Drive CV Upload (PDF, DOC, DOCX)
  var cvUrl = String(data.cvLink || '').trim();
  if (data.cvFile && data.cvFile.base64 && data.cvFile.name) {
    var fileName = String(data.cvFile.name).trim();
    var lowerName = fileName.toLowerCase();
    var validExt = lowerName.endsWith('.pdf') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx');
    if (!validExt) {
      throw new Error('Invalid CV file type. Only PDF, DOC, and DOCX files are allowed.');
    }

    var bytes = Utilities.base64Decode(data.cvFile.base64);
    if (bytes.length > MAX_CV_BYTES) {
      throw new Error('CV file exceeds the 5 MB limit.');
    }

    var safeMime = lowerName.endsWith('.pdf')
      ? 'application/pdf'
      : lowerName.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/msword';

    var safeFileName = appId + '_' + fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    var blob = Utilities.newBlob(bytes, safeMime, safeFileName);
    var savedFile = refs.folder.createFile(blob);
    savedFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    syncFileViewerPermissions_(savedFile);
    cvUrl = savedFile.getUrl();
  }

  if (!cvUrl) {
    throw new Error('CV file upload is required.');
  }

  // Append row atomically to private Google Sheet
  var rowValues = [
    appId,
    submittedAt,
    name,
    country,
    whatsapp,
    position,
    currentApp,
    adminsCount === '' ? '—' : adminsCount,
    agenciesCount === '' ? '—' : agenciesCount,
    coinPackage || '—',
    workExperience,
    cvUrl,
    'Pending'
  ];

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    refs.sheet.appendRow(rowValues);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // Send instant email notification safely (never fail the application if MailApp errors)
  var emailSent = false;
  try {
    var subject = 'New Application Received – ZoZo Live Recruitment';
    var dashboardTarget = ADMIN_DASHBOARD_URL
      ? ADMIN_DASHBOARD_URL + (ADMIN_DASHBOARD_URL.indexOf('?') !== -1 ? '&' : '?') + 'id=' + encodeURIComponent(appId)
      : refs.spreadsheet.getUrl();

    var lines = [
      language === 'bn'
        ? 'New Application Received – ZoZo Live Recruitment (বাংলা আবেদন)'
        : 'New Application Received – ZoZo Live Recruitment',
      '================================================',
      '',
      'Internal Application ID : ' + appId,
      'Applicant Name          : ' + name,
      'Country                 : ' + country,
      'WhatsApp Number         : ' + whatsapp,
      'Applied Position        : ' + position,
      'Currently Working App   : ' + currentApp
    ];
    if (position === 'Super Admin') {
      lines.push('Number of Admins        : ' + adminsCount);
      lines.push('Number of Agencies      : ' + agenciesCount);
    } else if (position === 'Admin') {
      lines.push('Number of Agencies      : ' + agenciesCount);
    } else if (position === 'Coin Seller') {
      lines.push('Coin Selling Package    : ' + coinPackage);
    }
    lines.push('Experience Details      : ' + workExperience);
    lines.push('Uploaded CV Link        : ' + cvUrl);
    lines.push('');
    lines.push('View Application        : ' + dashboardTarget);
    lines.push('Private Google Sheet    : ' + refs.spreadsheet.getUrl());

    MailApp.sendEmail(OWNER_EMAIL, subject, lines.join('\\n'));
    emailSent = true;
  } catch (mailErr) {
    Logger.log('Email warning (application preserved): ' + mailErr);
  }

  return jsonResponse_({
    ok: true,
    applicationId: appId,
    cvFileUrl: cvUrl,
    spreadsheetUrl: refs.spreadsheet.getUrl(),
    cvFolderUrl: refs.folder.getUrl(),
    emailSent: emailSent
  });
}

function handleAdminList_() {
  var refs = ensureDbHandles_();
  var values = refs.sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0]) continue;
    rows.push({
      id: String(r[0]),
      submittedAt: String(r[1]),
      name: String(r[2]),
      country: String(r[3]),
      whatsapp: String(r[4]),
      position: String(r[5]),
      currentApp: String(r[6]),
      adminsCount: r[7] === '—' || r[7] === '' ? undefined : Number(r[7]),
      agenciesCount: r[8] === '—' || r[8] === '' ? undefined : Number(r[8]),
      coinPackage: r[9] === '—' || r[9] === '' ? undefined : String(r[9]),
      workExperience: String(r[10]),
      cvLink: String(r[11]),
      status: String(r[12] || 'Pending')
    });
  }
  return jsonResponse_({ ok: true, applications: rows.reverse(), spreadsheetUrl: refs.spreadsheet.getUrl() });
}

function handleAdminUpdate_(body) {
  var appId = String(body.applicationId || '').trim();
  if (!appId) return jsonResponse_({ ok: false, status: 400, error: 'Missing applicationId.' });

  var refs = ensureDbHandles_();
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var values = refs.sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === appId) {
        var rowNum = i + 1;
        if (body.name) refs.sheet.getRange(rowNum, 3).setValue(String(body.name).trim());
        if (body.country) refs.sheet.getRange(rowNum, 4).setValue(String(body.country).trim());
        if (body.whatsapp) refs.sheet.getRange(rowNum, 5).setValue(String(body.whatsapp).trim());
        if (body.position && VALID_POSITIONS.indexOf(body.position) !== -1) refs.sheet.getRange(rowNum, 6).setValue(body.position);
        if (body.currentApp) refs.sheet.getRange(rowNum, 7).setValue(String(body.currentApp).trim());
        if (body.adminsCount !== undefined) refs.sheet.getRange(rowNum, 8).setValue(body.adminsCount === null ? '—' : Number(body.adminsCount));
        if (body.agenciesCount !== undefined) refs.sheet.getRange(rowNum, 9).setValue(body.agenciesCount === null ? '—' : Number(body.agenciesCount));
        if (body.coinPackage !== undefined) refs.sheet.getRange(rowNum, 10).setValue(body.coinPackage || '—');
        if (body.workExperience) refs.sheet.getRange(rowNum, 11).setValue(String(body.workExperience).trim());
        if (body.status && VALID_STATUSES.indexOf(body.status) !== -1) refs.sheet.getRange(rowNum, 13).setValue(body.status);
        SpreadsheetApp.flush();
        return jsonResponse_({ ok: true });
      }
    }
  } finally {
    lock.releaseLock();
  }
  return jsonResponse_({ ok: false, status: 404, error: 'Application not found in Google Sheet.' });
}

function handleAdminDelete_(applicationId) {
  var appId = String(applicationId || '').trim();
  if (!appId) return jsonResponse_({ ok: false, status: 400, error: 'Missing applicationId.' });

  var refs = ensureDbHandles_();
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var values = refs.sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === appId) {
        refs.sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return jsonResponse_({ ok: true });
      }
    }
  } finally {
    lock.releaseLock();
  }
  return jsonResponse_({ ok: false, status: 404, error: 'Application not found in Google Sheet.' });
}

function handleAdminManageAccess_(body) {
  var props = PropertiesService.getScriptProperties();
  var entries = Array.isArray(body.entries) ? body.entries : [];
  props.setProperty('ADMIN_ACCESS_JSON', JSON.stringify(entries));

  var refs = ensureDbHandles_();
  var ssFile = DriveApp.getFileById(refs.spreadsheet.getId());
  ssFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  refs.folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  var oldEditors = ssFile.getEditors();
  for (var e = 0; e < oldEditors.length; e++) {
    var em = oldEditors[e].getEmail().toLowerCase();
    if (em !== OWNER_EMAIL.toLowerCase()) ssFile.removeEditor(em);
  }
  var oldViewers = ssFile.getViewers();
  for (var v = 0; v < oldViewers.length; v++) {
    var vm = oldViewers[v].getEmail().toLowerCase();
    if (vm !== OWNER_EMAIL.toLowerCase()) ssFile.removeViewer(vm);
  }

  for (var k = 0; k < entries.length; k++) {
    var item = entries[k];
    var targetEmail = String(item.email || '').trim().toLowerCase();
    if (!targetEmail || targetEmail === OWNER_EMAIL.toLowerCase()) continue;
    if (item.role === 'Editor') {
      ssFile.addEditor(targetEmail);
      refs.folder.addViewer(targetEmail);
    } else if (item.role === 'Viewer') {
      ssFile.addViewer(targetEmail);
      refs.folder.addViewer(targetEmail);
    }
  }

  return jsonResponse_({ ok: true, count: entries.length });
}

function syncFileViewerPermissions_(driveFile) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('ADMIN_ACCESS_JSON');
  if (!raw) return;
  try {
    var list = JSON.parse(raw);
    for (var i = 0; i < list.length; i++) {
      var em = String(list[i].email || '').trim().toLowerCase();
      if (em && em !== OWNER_EMAIL.toLowerCase()) {
        try { driveFile.addViewer(em); } catch (e) {}
      }
    }
  } catch (err) {}
}

function ensureDbHandles_() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  var folderId = props.getProperty('CV_FOLDER_ID');
  if (!ssId || !folderId) {
    var created = setupZoZoRecruitmentDatabase();
    ssId = created.spreadsheetId;
    folderId = created.cvFolderId;
  }
  var ss = SpreadsheetApp.openById(ssId);
  var sheet = ss.getSheetByName('Applications') || ss.getSheets()[0];
  var folder = DriveApp.getFolderById(folderId);
  return { spreadsheet: ss, sheet: sheet, folder: folder };
}

function verifyGoogleAccessToken_(accessToken) {
  if (!accessToken) return null;
  var res = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return null;
  var info = JSON.parse(res.getContentText());
  if (!info.email || info.email_verified === false) return null;
  return { email: String(info.email).trim().toLowerCase(), name: info.name || info.email };
}

function getAdminPermission_(email) {
  var lower = String(email || '').trim().toLowerCase();
  if (lower === OWNER_EMAIL.toLowerCase()) {
    return { email: lower, role: 'Owner', canDelete: true };
  }
  var raw = PropertiesService.getScriptProperties().getProperty('ADMIN_ACCESS_JSON');
  if (!raw) return null;
  var entries = JSON.parse(raw);
  for (var i = 0; i < entries.length; i++) {
    if (String(entries[i].email || '').trim().toLowerCase() === lower) {
      return entries[i];
    }
  }
  return null;
}

function generateApplicationId_() {
  var year = new Date().getFullYear();
  var rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return 'ZOZO-' + year + '-' + rand;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Optional Helper: Connect an existing Google Form to your live ZoZo Live Recruitment Web Portal.
 * Replaces only the form header description & confirmation message while preserving all existing responses.
 */
function attachPortalLinkToExistingForm(existingFormId, publicPortalUrl) {
  var formId = String(existingFormId || '').trim();
  if (!formId) {
    throw new Error('Provide your existing Google Form ID from https://docs.google.com/forms/d/<FORM_ID>/edit');
  }
  var portalUrl = String(publicPortalUrl || 'https://ais-pre-menrapitnclw3tdj2oqpih-957770790639.asia-east1.run.app/').trim();
  var form = FormApp.openById(formId);
  form.setRequireLogin(false);
  form.setDescription([
    'ZOZO LIVE – OFFICIAL GLOBAL RECRUITMENT PORTAL (Super Admin · Admin · Coin Seller)',
    '',
    'Apply directly on our official bilingual recruitment portal (No Google Sign-In Required):',
    portalUrl,
    '',
    'বাংলা আবেদনকারীরা সরাসরি আমাদের অফিসিয়াল ওয়েবসাইটে গিয়ে ফর্মটি পূরণ করুন (English / বাংলা উভয় ভাষায়):',
    portalUrl,
    '',
    'Official ZoZo Live App Download: https://download.zozolive.site/'
  ].join('\\n'));
  form.setConfirmationMessage(
    'Thank you for applying to ZoZo Live! For faster bilingual applications & CV uploads, visit: ' + portalUrl
  );
  Logger.log('Updated Google Form Responder URL: ' + form.getPublishedUrl());
  return form.getPublishedUrl();
}
`;
}
