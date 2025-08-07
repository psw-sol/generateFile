const fs = require('fs-extra');
const path = require('path');

/**
 * 문자열을 파스칼 케이스로 변환
 * 예: "main quest" → "MainQuest"
 */
function toPascalCase(str) {
    return str
        .replace(/[_\s]+/g, ' ')
        .replace(/\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .replace(/\s+/g, '');
}

/**
 * 2차원 배열 데이터를 JSON 배열로 변환
 * @param {string[][]} rows
 * @returns {{ json: object[], fields: Record<string, string> }}
 */
function convertSheetData(rows) {
    if (rows.length < 2) {
        throw new Error('시트의 행이 너무 적습니다. 최소 2행(헤더/타입) 필요');
    }

    const headers = rows[0];
    const types = rows[1];

    const validIndexes = headers
        .map((h, i) => ({ h, i }))
        .filter(({ h }) => !h.startsWith('!'))
        .map(({ i }) => i);

    const filteredHeaders = validIndexes.map(i => headers[i]);
    const filteredTypes = validIndexes.map(i => types[i]);
    const dataRows = rows.slice(2);

    const json = dataRows.map(row => {
        const obj = {};
        filteredHeaders.forEach((key, idx) => {
            const raw = row[validIndexes[idx]];
            const type = filteredTypes[idx];

            switch (type) {
                case 'int':
                case 'float':
                case 'double':
                    obj[key] = toNumberSafe(raw);
                    break;
                case 'bool':
                    obj[key] = raw?.toLowerCase() === 'true';
                    break;
                case 'arr_int':
                    obj[key] = raw?.split(/[,|]/).map(x => toNumberSafe(x));
                    break;
                case 'arr_string':
                    obj[key] = raw?.split(/[,|]/).map(x => String(x));
                    break;
                default:
                    obj[key] = raw;
            }
        });
        return obj;
    });

    const fields = {};
    filteredHeaders.forEach((h, i) => (fields[h] = filteredTypes[i]));

    return { json, fields };
}

function toNumberSafe(a) {
    if (typeof a === 'number') return a;
    if (typeof a === 'string') {
        const cleaned = a.replace(/,/g, '');
        const parsed = Number(cleaned);
        return isNaN(parsed) ? null : parsed;
    }
    return null;
}
/**
 * 탭 데이터를 JSON 파일로 저장
 * @param {Array<{spreadsheetName: string, sheetName: string, data: string[][]}>} sheets
 * @param {string} outputDir
 */
async function saveJsonFiles(sheets, outputDir) {
    await fs.ensureDir(outputDir);

    for (const sheet of sheets) {
        const { sheetName, data } = sheet;

        const pascalName = toPascalCase(sheetName);
        const { json } = convertSheetData(data);

        const outPath = path.join(outputDir, `${pascalName}.json`);
        await fs.outputFile(outPath, JSON.stringify(json));

        console.log(`✅ ${pascalName}.json 저장 완료`);
    }
}

module.exports = {
    saveJsonFiles,
    convertSheetData,
    toPascalCase,
};
