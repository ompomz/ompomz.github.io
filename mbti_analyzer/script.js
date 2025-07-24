// script.js (エラーメッセージのテキスト修正)

function getMbtiStack(mbtiType) {
    mbtiType = mbtiType.toUpperCase(); // 大文字に変換

    // 正しいMBTIタイプの正規表現
    // 各文字がI/E, S/N, T/F, J/P のいずれかであることを厳密にチェック
    const validMbtiPattern = /^[IE][SN][TF][JP]$/;

    // MBTIタイプと英語名称のデータ
    const mbtiTypesList = [
        { type: "ISTJ", name: "Logistician" },
        { type: "ISFJ", name: "Defender" },
        { type: "INFJ", name: "Advocate" },
        { type: "INTJ", name: "Architect" },
        { type: "ISTP", name: "Virtuoso" },
        { type: "ISFP", name: "Adventurer" },
        { type: "INFP", name: "Mediator" },
        { type: "INTP", name: "Logician" },
        { type: "ESTP", name: "Entrepreneur" },
        { type: "ESFP", name: "Entertainer" },
        { type: "ENFP", name: "Campaigner" },
        { type: "ENTP", "name": "Debater" },
        { type: "ESTJ", name: "Executive" },
        { type: "ESFJ", name: "Consul" },
        { type: "ENFJ", name: "Protagonist" },
        { type: "ENTJ", name: "Commander" }
    ];

    // 入力値のバリデーションを強化
    if (!validMbtiPattern.test(mbtiType)) {
        // タイプ一覧のHTMLを生成
        // ここを修正しました
        let typeListHtml = '<p class="error-message">MBTIタイプの4文字を入力してください<br>タイプ一覧</p>';
        typeListHtml += '<table style="width:100%; border-collapse: collapse; margin-top: 15px;">';
        typeListHtml += '<thead><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">タイプ</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">英語名称</th></tr></thead>';
        typeListHtml += '<tbody>';
        mbtiTypesList.forEach(item => {
            typeListHtml += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${item.type}</td><td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td></tr>`;
        });
        typeListHtml += '</tbody></table>';

        return { error: typeListHtml };
    }

    const e_i = mbtiType[0];
    const s_n = mbtiType[1];
    const t_f = mbtiType[2];
    const j_p = mbtiType[3];

    let dominantFunction = "";
    let auxiliaryFunction = "";
    let tertiaryFunction = "";
    let inferiorFunction = "";

    function determineFunction(funcType, attitude) {
        return funcType + attitude;
    }

    function getOppositeFunctionType(funcType) {
        switch (funcType) {
            case 'S': return 'N';
            case 'N': return 'S';
            case 'T': return 'F';
            case 'F': return 'T';
            default: return '';
        }
    }

    function getFullFunctionName(func) {
        const type = func[0];
        const attitude = func[1];
        let name = '';

        if (type === 'F') name = '感情';
        else if (type === 'T') name = '思考';
        else if (type === 'N') name = '直観';
        else if (type === 'S') name = '感覚';

        if (attitude === 'i') name = '内向的' + name;
        else if (attitude === 'e') name = '外向的' + name;

        return name;
    }

    if (e_i === 'I') {
        if (j_p === 'J') {
            dominantFunction = determineFunction(s_n, 'i');
            auxiliaryFunction = determineFunction(t_f, 'e');
        } else {
            dominantFunction = determineFunction(t_f, 'i');
            auxiliaryFunction = determineFunction(s_n, 'e');
        }
    } else {
        if (j_p === 'J') {
            dominantFunction = determineFunction(t_f, 'e');
            auxiliaryFunction = determineFunction(s_n, 'i');
        } else {
            dominantFunction = determineFunction(s_n, 'e');
            auxiliaryFunction = determineFunction(t_f, 'i');
        }
    }

    const inferiorFunctionType = getOppositeFunctionType(dominantFunction[0]);
    const inferiorAttitude = (dominantFunction[1] === 'e') ? 'i' : 'e';
    inferiorFunction = determineFunction(inferiorFunctionType, inferiorAttitude);

    const tertiaryFunctionType = getOppositeFunctionType(auxiliaryFunction[0]);
    const tertiaryAttitude = (auxiliaryFunction[1] === 'e') ? 'i' : 'e';
    tertiaryFunction = determineFunction(tertiaryFunctionType, tertiaryAttitude);

    return {
        stack: `${dominantFunction}-${auxiliaryFunction}-${tertiaryFunction}-${inferiorFunction}`,
        details: {
            dominant: { symbol: dominantFunction, name: getFullFunctionName(dominantFunction) },
            auxiliary: { symbol: auxiliaryFunction, name: getFullFunctionName(auxiliaryFunction) },
            tertiary: { symbol: tertiaryFunction, name: getFullFunctionName(tertiaryFunction) },
            inferior: { symbol: inferiorFunction, name: getFullFunctionName(inferiorFunction) }
        }
    };
}

function displayMbtiStack() {
    const mbtiInput = document.getElementById('mbtiInput');
    const resultArea = document.getElementById('resultArea');
    const mbtiType = mbtiInput.value.trim();

    const result = getMbtiStack(mbtiType);

    if (result.error) {
        // エラーメッセージとタイプ一覧をそのまま表示
        resultArea.innerHTML = result.error;
    } else {
        resultArea.innerHTML = `
            <p>入力されたタイプ：<strong>${mbtiType.toUpperCase()}</strong></p>
            <p>心理機能スタック：<strong>${result.stack}</strong></p>
            <div style="margin-top: 20px; text-align: left;">
                <p>主機能：${result.details.dominant.symbol}（${result.details.dominant.name}）</p>
                <p>補助機能：${result.details.auxiliary.symbol}（${result.details.auxiliary.name}）</p>
                <p>第三機能：${result.details.tertiary.symbol}（${result.details.tertiary.name}）</p>
                <p>劣等機能：${result.details.inferior.symbol}（${result.details.inferior.name}）</p>
            </div>
        `;
    }
}
