const { google } = require('googleapis');

/**
 * Google API 클라이언트 생성
 * @param {string} credentialsPath
 * @returns {Promise<{ drive: any, sheets: any }>}
 */
async function getGoogleClients(credentialsPath) {
    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: [
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/spreadsheets.readonly',
        ],
    });

    const client = await auth.getClient();

    return {
        drive: google.drive({ version: 'v3', auth: client }),
        sheets: google.sheets({ version: 'v4', auth: client }),
    };
}

/**
 * 폴더 ID 내 스프레드시트 리스트
 * @param {any} drive
 * @param {string} folderId
 * @returns {Promise<Array<{ id: string, name: string }>>}
 */
async function listSpreadsheetsInFolder(drive, folderId) {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet'`,
        fields: 'files(id, name)',
    });

    return res.data.files || [];
}

/**
 * 특정 스프레드시트의 모든 시트 탭을 JSON으로 반환
 * @param {any} sheets
 * @param {string} spreadsheetId
 * @returns {Promise<Object>} { tabName1: [...], tabName2: [...] }
 */
async function exportSpreadsheetTabs(sheets, spreadsheetId) {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });

    const result = {};
    for (const sheet of metadata.data.sheets) {
        const sheetTitle = sheet.properties.title;
        const range = `${sheetTitle}!A1:Z1000`;

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        result[sheetTitle] = res.data.values || [];
    }

    return result;
}

/**
 * 폴더 내 모든 시트 탭 데이터 수집
 * @param {string} folderId
 * @param {string} credentialsPath
 * @returns {Promise<Array<{ spreadsheetName: string, sheetName: string, data: string[][] }>>}
 */
async function fetchGoogleSheetData(folderId, credentialsPath) {
    const { drive, sheets } = await getGoogleClients(credentialsPath);
    const files = await listSpreadsheetsInFolder(drive, folderId);

    const allData = [];

    for (const file of files) {
        const sheetData = await exportSpreadsheetTabs(sheets, file.id);

        for (const [sheetName, data] of Object.entries(sheetData)) {
            allData.push({
                spreadsheetName: file.name,
                sheetName,
                data,
            });
        }
    }

    return allData;
}

module.exports = {
    fetchGoogleSheetData,
};
