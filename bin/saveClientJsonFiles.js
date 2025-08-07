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
 * @returns {{json: {}, fields: {}}}
 */
function convertSheetData(rows) {
    if (rows.length < 2) {
        throw new Error('시트의 행이 너무 적습니다. 최소 2행(헤더/타입) 필요');
    }

    const allHeaders = rows[0];
    const allTypes = rows[1];
    const dataRows = rows.slice(2);

    const validIndexes = allHeaders
        .map((h, i) => ({ h, i }))
        .filter(({ h }) => !h.startsWith('!'))
        .map(({ i }) => i);

    const headers = validIndexes.map(i => allHeaders[i]);
    const types = validIndexes.map(i => allTypes[i]);

    const idKey = headers[0]; // 필터링된 첫 번째 컬럼이 ID로 사용됨

    const tempMap = new Map();

    for (const row of dataRows) {
        const obj = {};

        headers.forEach((key, idx) => {
            const raw = row[validIndexes[idx]];
            const type = types[idx];

            switch (type) {
                case 'int':
                case 'float':
                case 'double':
                    obj[key] = Number(raw);
                    break;
                case 'bool':
                    obj[key] = raw?.toLowerCase() === 'true';
                    break;
                case 'arr_int':
                    obj[key] = raw?.split(/[,|]/).map(x => Number(x));
                    break;
                case 'arr_string':
                    obj[key] = raw?.split(/[,|]/).map(x => String(x));
                    break;
                default:
                    obj[key] = raw;
            }
        });

        const id = obj[idKey];
        if (tempMap.has(id)) {
            const existing = tempMap.get(id);
            if (Array.isArray(existing)) {
                existing.push(obj);
            } else {
                tempMap.set(id, [existing, obj]);
            }
        } else {
            tempMap.set(id, obj);
        }
    }

    const json = {};
    for (const [id, value] of tempMap.entries()) {
        json[id] = value;
    }

    const fields = {};
    headers.forEach((h, i) => (fields[h] = types[i]));

    return { json, fields };
}


/**
 * 탭 데이터를 JSON 파일로 저장
 * @param {Array<{spreadsheetName: string, sheetName: string, data: string[][]}>} sheets
 * @param {string} outputDir
 */
async function saveClientJsonFiles(sheets, outputDir) {
    await fs.ensureDir(outputDir);

    for (const sheet of sheets) {
        const { sheetName, data } = sheet;

        const pascalName = toPascalCase(sheetName);
        const { json } = convertSheetData(data);

        const outPath = path.join(outputDir, `${pascalName}.json`);
        await fs.writeJson(outPath, json, { spaces: 2 });

        console.log(`✅ ${pascalName}.json 저장 완료`);
    }
}

module.exports = {
    saveClientJsonFiles,
    toPascalCase,
};
