/**
 * Google Apps Script web app: append anonymous lecture usage events to a Sheet.
 *
 * Prefer reusing the **same** deployed web app URL already used for STA2002
 * (filter rows by the `course` column: STA2002 vs DOTE2011).
 *
 * Setup (only if you have not deployed yet):
 * 1. Open a Google Sheet → Extensions → Apps Script
 * 2. Paste this file as Code.gs
 * 3. Deploy → Web app → Anyone
 * 4. Put the web app URL in the GitHub Actions secret VITE_USAGE_LOG_URL
 *
 * Sheet tab name: usage_log (created automatically)
 */

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || "";
    var data = JSON.parse(raw);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("usage_log");
    if (!sheet) {
      sheet = ss.insertSheet("usage_log");
      sheet.appendRow([
        "received_at",
        "ts",
        "type",
        "course",
        "lecture",
        "sessionId",
        "page",
        "sceneId",
        "chapter",
        "label",
        "isGame",
        "detail",
      ]);
    }
    sheet.appendRow([
      new Date().toISOString(),
      data.ts || "",
      data.type || "",
      data.course || "",
      data.lecture || "",
      data.sessionId || "",
      data.page || "",
      data.sceneId || "",
      data.chapter || "",
      data.label || "",
      data.isGame === true ? "yes" : data.isGame === false ? "no" : "",
      data.detail || "",
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON,
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/** Optional health check in the browser. */
function doGet() {
  return ContentService.createTextOutput("usage_log ok");
}
