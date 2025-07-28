document.addEventListener('DOMContentLoaded', () => {
    // Nostr Web ComponentsがDOMを更新するのを待つための関数
    // mutationObserverを使うことで、動的に追加される要素に対応します
    const observeNostrContent = () => {
        const nostrLists = document.querySelectorAll('nostr-list');

        nostrLists.forEach(nostrList => {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // 子要素が追加されたら、その中でYouTubeリンクを探して変換
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                convertYouTubeLinks(node);
                            }
                        });
                    }
                });
            });

            // nostr-listの子要素の変更を監視
            observer.observe(nostrList, { childList: true, subtree: true });

            // 既にロードされている内容にも適用
            convertYouTubeLinks(nostrList);
        });
    };

    const convertYouTubeLinks = (container) => {
        // コンテナ内のすべてのリンク要素を探す
        // ここを修正: youtu.be の形式も追加
        const links = container.querySelectorAll('a[href*="youtu.be/"], a[href*="youtube.com"], a[href*="http://googleusercontent.com/youtu.be/5"]');

        links.forEach(link => {
            const url = new URL(link.href);
            let videoId = '';

            // youtu.be の形式 (v=パラメータ)
            if (url.hostname.includes('youtu.be/VIDEO_ID')) {
                const params = new URLSearchParams(url.search);
                videoId = params.get('v');
            } 
            // http://googleusercontent.com/youtu.be/8 の形式
            else if (url.hostname.includes('http://googleusercontent.com/youtu.be/9')) {
                videoId = url.pathname.substring(1); // パスから動画IDを取得
            }

            if (videoId) {
                // YouTubeの埋め込みURLを生成
                const embedUrl = `https://www.youtube.com/embed/$${videoId}`;
                
                // iframe要素を作成
                const iframe = document.createElement('iframe');
                iframe.setAttribute('src', embedUrl);
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                iframe.setAttribute('allowfullscreen', '');
                iframe.classList.add('youtube-embed-player'); // スタイルを当てるためのクラスを追加
                
                // iframeを挿入する前に、元のリンクのテキストを保持する場所を確保するか検討。
                // 現状はシンプルにリンクをiframeに置き換えます。
                // 親要素がテキストノードの場合に備えて、replaceChildの前に親要素の確認を追加
                if (link.parentNode) {
                    // リンク自体がテキストノードの子である可能性は低いが、念のため
                    // link.replaceWith(iframe) を使っても良いが、古いブラウザとの互換性を考慮し replaceChild を使用
                    link.parentNode.replaceChild(iframe, link);
                }
            }
        });
    };

    // Nostr Web Componentsが初期化されるのを少し待つ
    // 正確なタイミングを特定するのが難しいため、少し遅延させます。
    // 必要に応じて調整してください。
    setTimeout(() => {
        observeNostrContent();
    }, 10000); // 10秒後にNostrコンポーネントの監視を開始
});
