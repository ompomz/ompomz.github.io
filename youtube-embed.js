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
        const links = container.querySelectorAll('a[href*="youtube.com/watch"], a[href*="youtu.be/"]');

        links.forEach(link => {
            const url = new URL(link.href);
            let videoId = '';

            if (url.hostname.includes('youtube.com')) {
                // youtube.com/watch?v=VIDEO_ID の形式
                const params = new URLSearchParams(url.search);
                videoId = params.get('v');
            } else if (url.hostname.includes('youtu.be')) {
                // youtu.be/VIDEO_ID の形式
                videoId = url.pathname.substring(1);
            }

            if (videoId) {
                // YouTubeの埋め込みURLを生成
                const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                
                // iframe要素を作成
                const iframe = document.createElement('iframe');
                iframe.setAttribute('src', embedUrl);
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                iframe.setAttribute('allowfullscreen', '');
                iframe.classList.add('youtube-embed-player'); // スタイルを当てるためのクラスを追加

                // 元のリンク要素をiframeに置き換える
                // 親要素のテキストノードにリンクが含まれている場合を考慮
                if (link.parentNode && link.parentNode.nodeType === Node.TEXT_NODE) {
                    // テキストノードの中にリンクがある場合は、リンクのテキストを保持しつつiframeを挿入
                    const span = document.createElement('span');
                    span.textContent = link.textContent; // リンクのテキストを保持
                    link.parentNode.replaceChild(iframe, link); // iframeでリンクを置き換え
                    // iframeの直前に元のテキストも挿入することも考えられますが、
                    // 今回はシンプルにiframeに置き換えます。
                    // もし元のテキスト（動画タイトルなど）も表示したい場合は別途検討が必要です。
                } else if (link.parentNode) {
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
    }, 1000); // 1秒後にNostrコンポーネントの監視を開始
});
