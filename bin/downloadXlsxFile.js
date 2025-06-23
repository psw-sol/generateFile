const fs = require('fs');
const path = require('path');

async function downloadXlsxFile(drive, fileId, outputDir, filename) {
    const destPath = path.join(outputDir, filename);
    const dest = fs.createWriteStream(destPath);

    await drive.files.export(
        {
            fileId,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        { responseType: 'stream' }
    ).then(res => {
        return new Promise((resolve, reject) => {
            res.data
                .on('end', () => resolve(destPath))
                .on('error', err => reject(err))
                .pipe(dest);
        });
    });

    return destPath;
}

module.exports = { downloadXlsxFile };
