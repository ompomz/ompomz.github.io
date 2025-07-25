function getMbtiStack(mbtiType) {
    mbtiType = mbtiType.toUpperCase();
    const validMbtiPattern = /^[IE][SN][TF][JP]$/;

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
        { type: "ENTP", name: "Debater" },
        { type: "ESTJ", name: "Executive" },
        { type: "ESFJ", name: "Consul" },
        { type: "ENFJ", name: "Protagonist" },
        { type: "ENTJ", name: "Commander" }
    ];

    if (!validMbtiPattern.test(mbtiType)) {
        let typeListHtml = '<p class="error-message">MBTIタイプの4文字を入力してください。<br>タイプ一覧</p>';
        typeListHtml += '<table class="mbti-functions-table" style="max-width: 400px; margin: 15px auto; font-size: 1em;">';
        typeListHtml += '<thead><tr><th>タイプ</th><th>英語名称</th></tr></thead>';
        typeListHtml += '<tbody>';
        mbtiTypesList.forEach(item => {
            typeListHtml += `<tr><td>${item.type}</td><td>${item.name}</td></tr>`;
        });
        typeListHtml += '</tbody></table>';
        return { error: typeListHtml };
    }

    const [e_i, s_n, t_f, j_p] = mbtiType;
    const isIntrovert = e_i === 'I';
    const isJudging = j_p === 'J';

    function getFullFunctionName(func) {
        const typeMap = { 'F': '感情', 'T': '思考', 'N': '直観', 'S': '感覚' };
        const attMap = { 'i': '内向的', 'e': '外向的' };
        return `${attMap[func[1]]}${typeMap[func[0]]}`;
    }

    function flipAttitude(attitude) {
        return attitude === 'i' ? 'e' : 'i';
    }

    function getOppositeFuncType(type) {
        return { 'T': 'F', 'F': 'T', 'S': 'N', 'N': 'S' }[type];
    }

    // 主・補助・第三・劣等
    let dom, aux;
    if (isIntrovert) {
        dom = isJudging ? s_n + 'i' : t_f + 'i';
        aux = isJudging ? t_f + 'e' : s_n + 'e';
    } else {
        dom = isJudging ? t_f + 'e' : s_n + 'e';
        aux = isJudging ? s_n + 'i' : t_f + 'i';
    }

    const ter = getOppositeFuncType(aux[0]) + flipAttitude(aux[1]);
    const inf = getOppositeFuncType(dom[0]) + flipAttitude(dom[1]);

    // 5～8番目の機能（主～劣等の外向/内向反転）
    const nem = dom[0] + flipAttitude(dom[1]);
    const cri = aux[0] + flipAttitude(aux[1]);
    const tri = ter[0] + flipAttitude(ter[1]);
    const dem = inf[0] + flipAttitude(inf[1]);

    const stack = [
        { role_jp: '主機能', symbol: dom, name_jp: getFullFunctionName(dom), role_en: 'Hero' },
        { role_jp: '補助機能', symbol: aux, name_jp: getFullFunctionName(aux), role_en: 'Parent' },
        { role_jp: '第三機能', symbol: ter, name_jp: getFullFunctionName(ter), role_en: 'Child' },
        { role_jp: '劣等機能', symbol: inf, name_jp: getFullFunctionName(inf), role_en: 'Inferior' },
        { role_jp: '第五機能', symbol: nem, name_jp: getFullFunctionName(nem), role_en: 'Nemesis' },
        { role_jp: '第六機能', symbol: cri, name_jp: getFullFunctionName(cri), role_en: 'Critic' },
        { role_jp: '第七機能', symbol: tri, name_jp: getFullFunctionName(tri), role_en: 'Trickster' },
        { role_jp: '第八機能', symbol: dem, name_jp: getFullFunctionName(dem), role_en: 'Demon' }
    ];

    return { stack, mbtiType };
}

function displayMbtiStack() {
    const mbtiInput = document.getElementById('mbtiInput');
    const resultArea = document.getElementById('resultArea');
    const mbtiType = mbtiInput.value.trim();
    const result = getMbtiStack(mbtiType);

    if (result.error) {
        resultArea.innerHTML = result.error;
        return;
    }

    let initialDisplayHtml = `
        <p>入力されたタイプ：<strong>${result.mbtiType}</strong></p>
        <p>心理機能スタック：<strong>${result.stack.slice(0, 4).map(f => f.symbol).join('-')}</strong></p>
    `;

    let tableRowsHtml = '';
    result.stack.forEach((f) => {
        tableRowsHtml += `
            <tr>
                <td>${f.role_jp}（${f.role_en}）</td>
                <td>${f.symbol}</td>
                <td>${f.name_jp}</td>
            </tr>`;
    });

    // ここが変更点: ボタンをhiddenContentWrapperの外に出す
    const tableHtml = `
        <div id="hiddenTableContainer" class="hidden-content">
            <table class="mbti-functions-table">
                <thead>
                    <tr><th>役割</th><th>心理機能</th><th>機能名称</th></tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>
        </div>
    `;

    const buttonHtml = `<button id="toggleButton" class="toggle-button">もっと見る</button>`;


    // resultAreaにすべてのHTMLを結合して設定
    // initialDisplayHtml の後にボタン、その後に非表示のテーブルコンテナ
    resultArea.innerHTML = initialDisplayHtml + buttonHtml + tableHtml;

    const toggleButton = document.getElementById('toggleButton');
    // テーブルだけを囲む新しいコンテナのID
    const hiddenTableContainer = document.getElementById('hiddenTableContainer');

    if (toggleButton && hiddenTableContainer) {
        toggleButton.addEventListener('click', () => {
            const isHidden = hiddenTableContainer.style.display === 'none' || hiddenTableContainer.style.display === '';
            hiddenTableContainer.style.display = isHidden ? 'block' : 'none'; // block で表示

            toggleButton.textContent = isHidden ? '隠す' : 'もっと見る';
        });
    } else {
        console.error("Error: toggleButton or hiddenTableContainer not found after innerHTML update.");
    }
}

document.getElementById('analyzeButton').addEventListener('click', displayMbtiStack);
