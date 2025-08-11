document.addEventListener('DOMContentLoaded', () => {
    // UI要素の取得
    const loadRelaysButton = document.getElementById('load-relays-button');
    const loadListsButton = document.getElementById('load-lists-button');
    const previewButton = document.getElementById('preview-button');
    const saveButton = document.getElementById('save-button');
    const statusMessage = document.getElementById('status-message');
    const loadSection = document.getElementById('load-section');
    const editorSection = document.getElementById('editor-section');
    const eventSelect = document.getElementById('event-select');
    const eventInfo = document.getElementById('event-info');
    const publicPubkeysTextarea = document.getElementById('public-pubkeys-textarea');
    const privatePubkeysTextarea = document.getElementById('private-pubkeys-textarea');
    const previewSection = document.getElementById('preview-section');
    const eventJsonTextarea = document.getElementById('event-json-textarea');
    const relayStatusSection = document.getElementById('relay-status-section');
    const relayStatusList = document.getElementById('relay-status-list');

    // グローバル変数
    let writableRelays = [];
    let allEvents = [];
    let currentPubkey = null;
    let selectedEventId = null;

    // UIの状態を更新するヘルパー関数
    function updateStatus(message, type = 'default') {
        statusMessage.textContent = message;
        statusMessage.className = '';
        if (type === 'success') {
            statusMessage.classList.add('status-success');
        } else if (type === 'error') {
            statusMessage.classList.add('status-error');
        } else if (type === 'pending') {
            statusMessage.classList.add('status-pending');
        }
    }

    // リレーリストの読み込み
    async function loadRelayList() {
        if (!window.nostr || !window.nostr.getPublicKey) {
            updateStatus('エラー: NIP-07対応の拡張機能が見つかりません。', 'error');
            alert('NIP-07対応の拡張機能をインストールしてください (例: Alby, nos2x)。');
            return;
        }

        updateStatus('リレーリストを読み込み中...', 'pending');
        try {
            currentPubkey = await window.nostr.getPublicKey();
            const relays = await window.nostr.getRelays();
            writableRelays = Object.entries(relays)
                .filter(([url, { write }]) => write)
                .map(([url]) => url);

            if (writableRelays.length === 0) {
                throw new Error('書き込み可能なリレーが見つかりませんでした。');
            }

            updateStatus(`書き込み可能なリレーを${writableRelays.length}件読み込みました。`, 'success');
            loadRelaysButton.classList.add('hidden');
            loadListsButton.classList.remove('hidden');
        } catch (error) {
            updateStatus(`エラー: ${error.message}`, 'error');
            console.error('リレーリストの読み込みに失敗しました:', error);
        }
    }

    // kind:30000リストの読み込み
    async function loadLists() {
        if (!currentPubkey) {
            updateStatus('まずリレーリストを読み込んでください。', 'error');
            return;
        }
        
        updateStatus('フォローリストを読み込み中...', 'pending');
        allEvents = [];
        const uniqueEvents = new Map();
        let processedRelays = 0;

        // WebSocket接続とイベント取得
        const fetchEventsFromRelay = (relayUrl) => {
            return new Promise((resolve) => {
                const ws = new WebSocket(relayUrl);
                const timeoutId = setTimeout(() => {
                    ws.close();
                    resolve([]);
                }, 5000);

                ws.onopen = () => {
                    const filter = { kinds: [30000], authors: [currentPubkey] };
                    ws.send(JSON.stringify(["REQ", `list-req-${Date.now()}`, filter]));
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data[0] === "EVENT") {
                        const nostrEvent = data[2];
                        uniqueEvents.set(nostrEvent.id, nostrEvent);
                    } else if (data[0] === "EOSE") {
                        clearTimeout(timeoutId);
                        ws.close();
                        resolve(Array.from(uniqueEvents.values()));
                    }
                };

                ws.onerror = () => {
                    clearTimeout(timeoutId);
                    ws.close();
                    resolve([]);
                };
            });
        };

        // 全リレーからイベントを並行して取得
        const promises = writableRelays.map(fetchEventsFromRelay);
        await Promise.allSettled(promises);
        allEvents = Array.from(uniqueEvents.values()).sort((a, b) => b.created_at - a.created_at);

        // UIの更新
        renderEventSelector();
        if (allEvents.length > 0) {
            updateStatus('フォローリストの読み込みが完了しました。', 'success');
            editorSection.classList.remove('hidden');
        } else {
            updateStatus('既存のリストが見つかりませんでした。新しいリストを作成できます。', 'info');
            editorSection.classList.remove('hidden');
        }
    }

    // イベント選択ドロップダウンのレンダリング
    function renderEventSelector() {
        eventSelect.innerHTML = '';
        const newOption = document.createElement('option');
        newOption.textContent = '新しいリストを作成';
        newOption.value = 'new';
        eventSelect.appendChild(newOption);

        allEvents.forEach(event => {
            const option = document.createElement('option');
            const dTag = event.tags.find(tag => tag[0] === 'd');
            const titleTag = event.tags.find(tag => tag[0] === 'title');
            const eventTitle = titleTag ? titleTag[1] : (dTag ? dTag[1] : `ID: ${event.id.slice(0, 8)}...`);
            
            option.textContent = eventTitle;
            option.value = event.id;
            eventSelect.appendChild(option);
        });

        eventSelect.dispatchEvent(new Event('change'));
    }

    // 選択されたイベントのデータを表示
    async function handleEventSelection() {
        const selectedId = eventSelect.value;
        selectedEventId = selectedId;
        publicPubkeysTextarea.value = '';
        privatePubkeysTextarea.value = '';
        eventInfo.textContent = '';
        previewSection.classList.add('hidden');

        if (selectedId === 'new') {
            updateStatus('新しいリストを作成する準備ができました。', 'info');
            eventInfo.textContent = '新しいリストを作成します。d-tagは自動で追加されます。';
            return;
        }

        const eventToEdit = allEvents.find(e => e.id === selectedId);
        if (!eventToEdit) {
            updateStatus('選択されたイベントが見つかりません。', 'error');
            return;
        }
        
        const dTag = eventToEdit.tags.find(tag => tag[0] === 'd');
        const titleTag = eventToEdit.tags.find(tag => tag[0] === 'title');
        eventInfo.textContent = `d-tag: ${dTag ? dTag[1] : 'なし'} / title-tag: ${titleTag ? titleTag[1] : 'なし'}`;

        const publicPubkeys = eventToEdit.tags.filter(tag => tag[0] === 'p').map(tag => tag[1]);
        publicPubkeysTextarea.value = publicPubkeys.join('\n');

        if (eventToEdit.content) {
            try {
                updateStatus('非公開リストを復号化中...', 'pending');
                const decryptedContent = await window.nostr.nip04.decrypt(eventToEdit.pubkey, eventToEdit.content);
                const decryptedEvent = JSON.parse(decryptedContent);
                const privatePubkeys = decryptedEvent.p || [];
                privatePubkeysTextarea.value = privatePubkeys.join('\n');
                updateStatus('リストの読み込みと復号に成功しました。', 'success');
            } catch (error) {
                console.error('リストの復号に失敗しました:', error);
                privatePubkeysTextarea.value = '復号に失敗しました。';
                updateStatus('リストの復号に失敗しました。公開リストのみ表示しています。', 'error');
            }
        }
    }

    // イベントJSONのプレビュー生成
    async function previewEvent() {
        if (!currentPubkey) {
            alert('まずリレーリストを読み込んでください。');
            return;
        }

        const publicPubkeys = publicPubkeysTextarea.value.split(/,|\t| |\n/).map(s => s.trim()).filter(s => s.length > 0);
        const privatePubkeys = privatePubkeysTextarea.value.split(/,|\t| |\n/).map(s => s.trim()).filter(s => s.length > 0);

        if (publicPubkeys.length === 0 && privatePubkeys.length === 0) {
            alert('公開鍵が入力されていません。');
            return;
        }

        updateStatus('イベントJSONを生成中...', 'pending');
        
        try {
            const encryptedContent = await window.nostr.nip04.encrypt(currentPubkey, JSON.stringify({ p: privatePubkeys }));
            
            let newTags = [];
            if (selectedEventId !== 'new') {
                const existingEvent = allEvents.find(e => e.id === selectedEventId);
                if (existingEvent) {
                    newTags = existingEvent.tags.filter(tag => tag[0] !== 'p' && tag[0] !== 'd' && tag[0] !== 'title');
                }
            }
            
            const dTagValue = 'follow-list';
            if (!newTags.some(tag => tag[0] === 'd')) {
                newTags.push(['d', dTagValue]);
            }

            publicPubkeys.forEach(pk => {
                newTags.push(['p', pk]);
            });

            const newEvent = {
                kind: 30000,
                created_at: Math.floor(Date.now() / 1000),
                tags: newTags,
                content: encryptedContent
            };

            eventJsonTextarea.value = JSON.stringify(newEvent, null, 2);
            previewSection.classList.remove('hidden');
            updateStatus('イベントJSONが生成されました。内容を確認・編集し、署名・保存してください。', 'success');
        } catch (error) {
            updateStatus(`JSON生成エラー: ${error.message}`, 'error');
            console.error('JSON生成エラー:', error);
        }
    }

    // イベントの署名とリレーへの送信
    async function signAndSaveEvent() {
        if (writableRelays.length === 0) {
            alert('リレーリストが読み込まれていません。');
            return;
        }

        updateStatus('イベントに署名してリレーに送信中...', 'pending');
        relayStatusList.innerHTML = '';
        relayStatusSection.classList.remove('hidden');

        try {
            const newEvent = JSON.parse(eventJsonTextarea.value);
            const signedEvent = await window.nostr.signEvent(newEvent);
            
            writableRelays.forEach(relayUrl => {
                const statusElement = document.createElement('div');
                statusElement.className = 'relay-status pending';
                statusElement.textContent = `▶️ ${relayUrl} に送信中...`;
                relayStatusList.appendChild(statusElement);
                
                const ws = new WebSocket(relayUrl);
                ws.onopen = () => {
                    ws.send(JSON.stringify(["EVENT", signedEvent]));
                    
                    const timeoutId = setTimeout(() => {
                        if (statusElement.classList.contains('pending')) {
                            statusElement.textContent = `⚠️ ${relayUrl} への送信がタイムアウトしました`;
                            statusElement.className = 'relay-status error';
                            ws.close();
                        }
                    }, 8000);

                    ws.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        if (data[0] === "OK" && data[1] === signedEvent.id) {
                            statusElement.textContent = `✅ ${relayUrl} に送信成功`;
                            statusElement.className = 'relay-status success';
                            clearTimeout(timeoutId);
                            ws.close();
                        } else if (data[0] === "NOTICE" && data[1].includes(signedEvent.id)) {
                             statusElement.textContent = `❌ ${relayUrl} エラー: ${data[1]}`;
                            statusElement.className = 'relay-status error';
                            clearTimeout(timeoutId);
                            ws.close();
                        }
                    };

                    ws.onerror = () => {
                        statusElement.textContent = `❌ ${relayUrl} への接続または送信に失敗`;
                        statusElement.className = 'relay-status error';
                        clearTimeout(timeoutId);
                        ws.close();
                    };
                };
            });
            updateStatus('すべてのリレーへの送信処理を開始しました。', 'success');

        } catch (error) {
            updateStatus('イベントの署名または送信に失敗しました。', 'error');
            console.error('署名または送信エラー:', error);
        }
    }

    // イベントリスナーの設定
    loadRelaysButton.addEventListener('click', loadRelayList);
    loadListsButton.addEventListener('click', loadLists);
    eventSelect.addEventListener('change', handleEventSelection);
    previewButton.addEventListener('click', previewEvent);
    saveButton.addEventListener('click', signAndSaveEvent);
});
