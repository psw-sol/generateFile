#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const fs = require("fs");
const path = require("path");
const { fetchGoogleSheetData } = require("./fetchGoogleSheetData");
const { saveJsonFiles } = require("./saveJsonFiles");
const { generateCsFiles } = require("./generateCsFiles");
const {saveClientJsonFiles} = require("./saveClientJsonFiles")
const {fetchFromDownloadedXlsx} = require("./fetchGoogleSheetData")


const program = new Command();

program
    .allowExcessArguments()
    .description('엑셀 데이터를 파싱하여, 게임 및 서버 용 JSON, CSharp 파일을 자동으로 생성합니다.')
    .option('-f, --folder-id <path>', '폴더 아이디를 지정합니다')
    .option('-p, --cre-path <path>',  '인증서 파일 경로')
    .option('-d, --debug', '디버그 로그를 표시합니다.')
    .option('-o, --output-directory <path>', '커스텀 디렉토리를 설정합니다.')
    .option('-c, --no-client', '클라이언트용 데이터를 추출하지 않습니다.') // -> options.noClient
    .option('-s, --no-server', '서버용 데이터를 추출하지 않습니다.')      // -> options.noServer
    .action(async (options) => {
        console.log("옵션들", options)
        const outputDirectory = options.outputDirectory;
        const exportClientFile = options.client;
        const exportServerFile = options.server;
        const folderId = options.folderId;
        const credentialsPath = options.crePath;

        if(!folderId) {
            console.error("❌ -f / --folder-id 옵션은 필수입니다.");
            process.exit(1);
        }
        if(!credentialsPath) {
            console.error("❌ -p / --cre-path 옵션은 필수입니다.");
            process.exit(1);
        }
        let baseDir = outputDirectory ?? './output';
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }

        const jsonOutputDir = path.join(baseDir, 'Server');
        const csOutputDir = path.join(baseDir, 'cs');
        const clientJsonOutputDir = path.join(baseDir, 'clientJson')

        if (options.debug) {
            console.log("📁 출력 경로:", baseDir);
            console.log("🧪 클라이언트 파일 생성:", exportClientFile);
            console.log("🧪 서버 파일 생성:", exportServerFile);
        }

        //const folderId = '1kI78whpGHTwS7agvqBjysO2XwVg6pTRp';
        //const credentialsPath = './devs-f9aef-ae54f1add9f0.json';

        const sheets = await fetchGoogleSheetData(folderId, credentialsPath);

        if (exportClientFile) {
            await generateCsFiles(sheets, csOutputDir);
            await saveClientJsonFiles(sheets, clientJsonOutputDir)
        }
        if (exportServerFile) {
            await saveJsonFiles(sheets, jsonOutputDir);
        }

        console.log('✅ 변환 완료!');
    });

program.parseAsync(process.argv);
