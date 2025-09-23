document.addEventListener('DOMContentLoaded', () => {
    // ページ内にモーダル用のプレースホルダーがあるか確認
    const placeholder = document.getElementById('modal-placeholder');
    if (!placeholder) {
        console.warn('modal-placeholder が見つかりません。モーダルは動作しません。');
        return;
    }

    // モーダルのHTML構造をJavaScriptで作成
    const modalHTML = `
        <div id="modal" class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <img id="modal-image" class="modal-image" src="" alt="拡大画像">
            </div>
        </div>
    `;

    // プレースホルダーの場所にモーダルを挿入
    placeholder.innerHTML = modalHTML;
    
    // 挿入したモーダル要素を取得
    const modal = document.getElementById('modal');
    const closeButton = modal.querySelector('.close-button');

    // 閉じるボタンにイベントリスナーを設定
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // モーダルの背景部分をクリックしたときに閉じる
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// この関数は外部から呼び出せるようにグローバルに残しておく
function openModal(imageUrl) {
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modal-image');
    if (modal && modalImage) {
        modal.style.display = 'block';
        modalImage.src = imageUrl;
    } else {
        console.error('モーダル要素が見つかりません。');
    }
}
