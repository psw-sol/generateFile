const { google } = require('googleapis');
const { downloadXlsxFile } = require('./downloadXlsxFile');
const { parseExcelFileWithExcelJS } = require('./parseXlsxFile'); // 위에 정의된 파서
const { saveJsonFiles } = require('./saveJsonFiles');
const fs = require('fs-extra');
const path = require('path');
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
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

    const ranges = metadata.data.sheets
        .map(sheet => sheet.properties.title)
        .filter(title => !title.startsWith('~')) // ~로 시작하는 시트 제외
        .map(title => `${title}!A:AZ`);

    const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
    });

    const result = {};
    let j = 0;
    for (let i = 0; i < metadata.data.sheets.length; i++) {
        const title = metadata.data.sheets[i].properties.title;
        if (title.startsWith('~')) continue; // 혹시 모를 이중 방어

        result[title] = (res.data.valueRanges[j].values || []).filter(x=>{
            return x[0] != null && x[0].toString().trim() !== '';
        });
        j++;
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
        await delay(300); // 👉 문서마다 1초 대기
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

async function fetchFromDownloadedXlsx(folderId, credentialsPath, outputDir) {
    const { drive } = await getGoogleClients(credentialsPath);
    const files = await listSpreadsheetsInFolder(drive, folderId);
    console.log("test", outputDir)
    const tmpDir = path.join(outputDir, '__downloaded');
    await fs.ensureDir(tmpDir);

    const allSheets = [];

    for (const file of files) {
        const xlsxPath = await downloadXlsxFile(drive, file.id, tmpDir, `${file.name}.xlsx`);
        const parsedSheets = await parseExcelFileWithExcelJS(xlsxPath);

        console.log("✅ parsedSheets:", parsedSheets); // ← 이게 undefined인지 확인
        for (const sheet of parsedSheets) {
            allSheets.push({
                spreadsheetName: file.name,
                sheetName: sheet.sheetName,
                data: sheet.data,
            });
        }
    }

    return allSheets;
}
module.exports = {
    fetchGoogleSheetData,
    fetchFromDownloadedXlsx
};
