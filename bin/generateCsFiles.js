// generateCsFiles.js
const fs = require('fs-extra');
const path = require('path');

const typeMap = {
    int: 'int',
    float: 'float',
    double: 'double',
    bool: 'bool',
    string: 'string',
    arr_int: 'int[]',
    arr_float: 'float[]',
    arr_double: 'double[]',
    arr_bool: 'bool[]',
    arr_string: 'string[]',
};

/**
 * C# ScriptableObject + Info 클래스 하나의 파일에 생성
 * @param {Array<{sheetName: string, data: string[][]}>} sheets
 * @param {string} outputDir
 */
async function generateCsFiles(sheets, outputDir) {
    await fs.ensureDir(outputDir);

    for (const { sheetName, data } of sheets) {
        const entityName = `${sheetName}Entity`;
        const infoName = `${sheetName}EntityInfo`;
        const headers = data[0];
        const types = data[1];

        const fieldLines = headers.map((h, i) => {
            const rawType = types[i];
            const csType = typeMap[rawType] || 'string';
            return `    [Tooltip(\"${h}\"), Header(\"${h}\")]    public ${csType} ${h};`;
        }).join('\n');

        const csCode = `using UnityEngine;\nusing System.Collections.Generic;\nusing Cysharp.Threading.Tasks;\n\n[CreateAssetMenu(fileName = \"${entityName}\", menuName = \"ScriptableObjects/${entityName}\", order = 1)]\npublic class ${entityName} : ScriptableObject\n{\n    [SerializeField] public Dictionary<int, ${infoName}> DATA = new Dictionary<int, ${infoName}>();\n    [SerializeField] public SerializableDictionary<int, ${infoName}> ViewDATA = new SerializableDictionary<int, ${infoName}>();\n\n    private bool _isRemoteData = false;\n\n    private void OnValidate() { SyncData(); }\n\n    public void SyncData() {\n        DATA.Clear();\n        foreach (var kvp in ViewDATA) {\n            DATA[kvp.Key] = kvp.Value;\n        }\n    }\n\n    public async UniTask<bool> LoadData(List<${infoName}> _list) {\n        DATA.Clear();\n        foreach (var item in _list) {\n            DATA[item.${headers[0]}] = item;\n            await UniTask.CompletedTask;\n        }\n        _isRemoteData = true;\n        return true;\n    }\n\n    public void CheckRemoteDebug() {\n        CDebug.Log(\"${entityName} -> isRemoteData : \" + _isRemoteData);\n    }\n}\n\n[System.Serializable]\npublic class ${infoName} {\n${fieldLines}\n}`;

        await fs.writeFile(path.join(outputDir, `${entityName}.cs`), csCode, 'utf8');
        console.log(`✅ ${entityName}.cs 생성 완료 (단일 파일)`);
    }
}

module.exports = {
    generateCsFiles,
};
