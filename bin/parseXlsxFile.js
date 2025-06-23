const ExcelJS = require('exceljs');

async function parseExcelFileWithExcelJS(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const result = [];

    workbook.eachSheet((worksheet, sheetId) => {
        const sheetName = worksheet.name;
        if (sheetName.startsWith('~')) return; // ~ 시트 제외

        const data = [];
        worksheet.eachRow((row, rowNumber) => {
            const rowValues = row.values.slice(1); // 0번은 undefined
            data.push(rowValues);
        });

        result.push({ sheetName, data });
    });

    return result;
}

module.exports = { parseExcelFileWithExcelJS };