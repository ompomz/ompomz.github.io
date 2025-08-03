// script.js の内容

// ヘルパー関数群 (一部変更あり)
String.prototype.padStart = String.prototype.padStart ? String.prototype.padStart : function(targetLength, padString) {
  targetLength = Math.floor(targetLength) || 0;
  if (targetLength < this.length) return String(this);

  padString = padString ? String(padString) : " ";

  var pad = "";
  var len = targetLength - this.length;
  var i = 0;
  while (pad.length < len) {
    if (!padString[i]) {
      i = 0;
    }
    pad += padString[i];
    i++;
  }
  return pad + String(this).slice(0);
};

function getLanguage() {
  return (window.navigator.language || window.navigator.browserLanguage || window.navigator.userLanguage).substring(0, 2);
}

function formatTimestamp(date) {
  return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0");
}

function findTagWithValue(tags, name, value, extraPred) {
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (tag[0] === name && tag[1] === value && (extraPred ? extraPred(tag) : true)) {
      return tag;
    }
  }
  return undefined;
}

function baseEventView() {
  var li = document.createElement("li");
  li.classList.add("event");
  return li;
}

function externalLink(url, text) {
  var a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = text;
  return a;
}

function timestampView(unixtime) {
  var ts = new Date(unixtime * 1000);
  var timeElem = document.createElement("time");
  timeElem.setAttribute("datetime", ts.toISOString());
  timeElem.textContent = "[" + formatTimestamp(ts) + "]";
  return timeElem;
}

// === プロフィールキャッシュとpubkeyViewの変更 ===
const profileCache = {}; // 公開鍵をキーとするプロフィール情報のキャッシュ
const pubkeyElements = {}; // pubkeyViewが生成したHTML要素を保持するマップ

function getDisplayName(pubkey) {
  if (profileCache[pubkey] && profileCache[pubkey].name) {
    return profileCache[pubkey].name;
  }
  return pubkey.substring(0, 8); // キャッシュになければHEXの短縮形
}

function updatePubkeyView(pubkey) {
  const displayName = getDisplayName(pubkey);
  if (pubkeyElements[pubkey]) {
    pubkeyElements[pubkey].forEach(elem => {
      elem.textContent = displayName;
    });
  }
}

function pubkeyView(pubkey) {
  var npub = window.NostrTools.nip19.npubEncode(pubkey);
  var displayName = getDisplayName(pubkey); // キャッシュから名前を取得
  var a = externalLink("https://njump.me/" + npub, displayName);
  a.classList.add("pubkey-ref");

  // 要素をマップに保存し、後で更新できるようにする
  if (!pubkeyElements[pubkey]) {
    pubkeyElements[pubkey] = [];
  }
  pubkeyElements[pubkey].push(a);

  return a;
}

function metadataView(nostrEv) {
  var view = document.createElement("span");
  view.appendChild(timestampView(nostrEv.created_at));
  view.appendChild(document.createTextNode(" "));
  view.appendChild(pubkeyView(nostrEv.pubkey));
  view.appendChild(document.createTextNode(" > "));
  return view;
}

var contentRefPattern = /(https?:\/\/[^\s]+)|(nostr:[\w]+1[ac-hj-np-z02-9]+)|(:[_a-zA-Z0-9]+:)/;

function indexOfFirstUnmatchingCloseParen(url) {
  var nest = 0;
  for (var i = 0; i < url.length; i++) {
    var c = url.charAt(i);
    if (c === "(") {
      nest++;
    } else if (c === ")") {
      if (nest <= 0) {
        return i;
      }
      nest--;
    }
  }
  return -1;
}

function urlLinkElems(url) {
  var splitIdx = indexOfFirstUnmatchingCloseParen(url);
  var finalUrl = splitIdx === -1 ? url : url.substring(0, splitIdx);
  var rest = splitIdx === -1 ? "" : url.substring(splitIdx);

  var link = externalLink(finalUrl, finalUrl);

  if (rest.length === 0) {
    return [link];
  }
  var restSpan = document.createElement("span");
  restSpan.textContent = rest;
  return [link, restSpan];
}

function extractEventRef(nip19Decoded) {
  switch (nip19Decoded.type) {
    case "nevent":
      return {
        id: nip19Decoded.data.id,
        author: nip19Decoded.data.author
      };
    case "note":
      return {
        id: nip19Decoded.data
      }
    default:
      return undefined;
  }
}

function extractReplyRef(tags) {
  var root; // first "root" p-tag

  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    if (tag[0] !== "e") {
      continue;
    }
    if (tag[3] === "reply" && typeof tag[1] === "string") {
      return {
        id: tag[1],
        author: typeof tag[4] === "string" ? tag[4] : undefined
      };
    }
    if (root === undefined && tag[3] === "root" && typeof tag[1] === "string") {
      root = {
        id: tag[1],
        author: typeof tag[4] === "string" ? tag[4] : undefined
      };
    }
  }
  // no "reply" p-tag
  return root;
}

function nostrRefLink(nip19Id, idType) {
  var abbrId = nip19Id.substring(0, idType.length + 8) + "...";
  var a = externalLink("https://njump.me/" + nip19Id, "nostr:" + abbrId);
  a.classList.add("nostr-ref");
  return a;
}

function nostrEventRefLink(nip19id, idType, hexEventId) {
  var abbrId = nip19id.substring(0, idType.length + 8) + "...";
  var a = externalLink("https://njump.me/" + nip19id, abbrId);
  a.classList.add("nostr-ref");
  return a;
}

var lastHighlightedEventId;
window.addEventListener("hashchange", function() {
  if (window.location.hash.length === 0) {
    return;
  }

  var hash = window.location.hash.substring(1);
  if (hash.length === 0) {
    return;
  }
  if (lastHighlightedEventId) {
    var highlighted = document.getElementById(lastHighlightedEventId);
    if (highlighted) {
      highlighted.classList.remove("event-highlighted");
    }
  }
  var target = document.getElementById(hash);
  if (!target) {
    return;
  }
  lastHighlightedEventId = hash;
  target.classList.add("event-highlighted");
});

function pubkeyMention(pubkey) {
  var pubkeyRef = pubkeyView(pubkey);
  pubkeyRef.classList.add("pubkey-mention");
  return pubkeyRef;
}

function referentAuthor(pubkey) {
  var span = document.createElement("span");
  span.appendChild(document.createTextNode(" by "));
  span.appendChild(pubkeyView(pubkey));
  return span;
}

function inReplyToElems(nostrEv) {
  var replyRef = extractReplyRef(nostrEv.tags);
  if (replyRef === undefined) {
    return [];
  }

  var replySuffix = document.createElement("span");
  replySuffix.textContent = "<< ";
  replySuffix.classList.add("reply-suffix");

  var nevent = window.NostrTools.nip19.neventEncode(replyRef);
  var replyLink = nostrEventRefLink(nevent, "nevent", replyRef.id);

  if (!replyRef.author) {
    return [replyLink, replySuffix];
  }
  return [replyLink, referentAuthor(replyRef.author), replySuffix];
}

function postQuotationElems(nip19Id, idType, hexEventId, author) {
  var prefix = document.createElement("span");
  prefix.textContent = "QP: ";
  prefix.classList.add("quote-prefix");

  var link = nostrEventRefLink(nip19Id, idType, hexEventId);

  if (!author) {
    return [prefix, link];
  }
  return [prefix, link, referentAuthor(author)];
}

function nostrUriElems(ref, nostrEv) {
  var nip19Id = ref.substring(6); // trim "nostr:"
  var dec;
  try {
    dec = window.NostrTools.nip19.decode(nip19Id);
  } catch (err) {
    console.error("failed to decode NIP-19 ID:", err);
    return [document.createTextNode(ref)];
  }

  switch (dec.type) {
    case "npub":
      return [pubkeyMention(dec.data)];
    case "nprofile":
      return [pubkeyMention(dec.data.pubkey)];

    case "note":
    case "nevent":
      var evRef = extractEventRef(dec);
      if (ref === undefined) {
        console.error("unreachable");
        return [nostrRefLink(nip19Id, dec.type)];
      }
      var mentionTag = findTagWithValue(nostrEv.tags, "e", evRef.id, function(t) {
        t[3] === "mention"
      });
      var author = (mentionTag && mentionTag[4]) || evRef.author;
      return postQuotationElems(nip19Id, dec.type, evRef.id, evRef.author);

    default:
      return [nostrRefLink(nip19Id, dec.type)];
  }
}

function customEmojiElems(shortcode, nostrEv) {
  var emojiName = shortcode.substring(1, shortcode.length - 1);
  for (var i = 0; i < nostrEv.tags.length; i++) {
    var tag = nostrEv.tags[i];
    if (tag[0] === "emoji" && tag[1] === emojiName && typeof tag[2] === "string") {
      var img = document.createElement('img');
      img.src = tag[2];
      img.alt = shortcode;
      img.classList.add("custom-emoji");
      return [img];
    }
    if (tag[0] === "name" && tag[1] === emojiName && typeof tag[2] === "string") { // NIP-30 (name tag)
      var img = document.createElement('img');
      img.src = tag[2];
      img.alt = shortcode;
      img.classList.add("custom-emoji");
      return [img];
    }
  }
  // no matching emoji found
  return [document.createTextNode(shortcode)];
}

function postEventView(nostrEv) {
  var view = baseEventView();
  view.id = nostrEv.id;
  view.classList.add("event-post");

  view.appendChild(metadataView(nostrEv));
  inReplyToElems(nostrEv).forEach(function(e) {
    view.appendChild(e);
  });

  var contentElems = nostrEv.content.split(contentRefPattern)
    .filter(function(s) {
      return s !== undefined && s.length > 0;
    })
    .map(function(s) {
      if (s.indexOf("http") === 0) return urlLinkElems(s);
      else if (s.indexOf("nostr:") === 0) return nostrUriElems(s, nostrEv);
      else if (s.charAt(0) === ":" && s.charAt(s.length - 1) === ":") return customEmojiElems(s, nostrEv);
      else return [document.createTextNode(s)];
    });
  contentElems.forEach(function(elems) {
    elems.forEach(function(e) {
      view.appendChild(e);
    });
  });
  return view;
}

function repostEventView(nostrEv) {
  var targetPostId;
  var targetPostAuthor;
  for (var i = 0; i < nostrEv.tags.length; i++) {
    var tag = nostrEv.tags[i];
    if (tag[0] === "e" && typeof tag[1] === "string") {
      targetPostId = tag[1];
    }
    if (tag[0] === "p" && typeof tag[1] === "string") {
      targetPostAuthor = tag[1];
    }
    if (targetPostId && targetPostAuthor) {
      break;
    }
  }
  if (targetPostId === undefined) {
    console.error("repost without target post ID:", nostrEv);
    return undefined;
  }

  var view = baseEventView();
  view.classList.add("event-repost");

  view.appendChild(metadataView(nostrEv));

  var repostPrefix = document.createElement("span");
  repostPrefix.textContent = "RP: ";
  repostPrefix.classList.add("repost-prefix");

  var nevent = window.NostrTools.nip19.neventEncode({
    id: targetPostId
  });
  var repostLink = nostrEventRefLink(nevent, "nevent", targetPostId);

  view.appendChild(repostPrefix);
  view.appendChild(repostLink);
  if (targetPostAuthor) {
    view.appendChild(referentAuthor(targetPostAuthor));
  }
  return view;
}


// ==== メインのロジック部分 ====
var timeline = document.getElementById("timeline");
if (timeline === null) {
  throw new Error("no #timeline");
}

var relayInput = document.getElementById("relay-url");
var subscribeRelayButton = document.getElementById("subscribe-relay");
var pubkeyListInput = document.getElementById("pubkey-list");
var applyPubkeyListButton = document.getElementById("apply-pubkey-list");

var relayWS;
var oldestCreatedAt = Number.MAX_VALUE;
var newestCreatedAt = 0; // 最新イベントのcreated_atを追跡
var currentPubkeyFilters = []; // kind:1,6用
var currentRelayUrl = relayInput.value; // 初期リレーURL

var MAIN_SUB_ID = "motherfucking-main-sub";
var PROFILE_SUB_ID = "motherfucking-profile-sub";
var MORE_POSTS_SUB_ID = "motherfucking-more-posts-sub";

// Kind:0を取得するためのpubkeyキュー
const pubkeysToFetchProfile = new Set();
let profileFetchTimeout = null;

// 初回ロード時のイベントを一時的に格納するための変数
let isInitialLoad = false;
let initialEvents = [];

function clearTimeline() {
  while (timeline.firstChild) {
    timeline.removeChild(timeline.firstChild);
  }
  oldestCreatedAt = Number.MAX_VALUE;
  newestCreatedAt = 0;
}

// 自動更新のON/OFFチェックボックスの取得
var autoUpdateCheckbox = document.getElementById("auto-update");

// イベント表示処理（ここに自動更新制御を追加）
function onEvent(nostrEv, isFromMore = false) {
  // 自動更新OFFで、かつ新しい投稿（タイムスタンプがnewestCreatedAtより大きい）は無視
  if (!autoUpdateCheckbox.checked && !isFromMore && nostrEv.created_at > newestCreatedAt) {
    return;
  }

  if (nostrEv.kind === 0) {
    try {
      const metadata = JSON.parse(nostrEv.content);
      profileCache[nostrEv.pubkey] = {
        name: metadata.name || nostrEv.pubkey.substring(0, 8),
        picture: metadata.picture,
        about: metadata.about
      };
      updatePubkeyView(nostrEv.pubkey);
      pubkeysToFetchProfile.delete(nostrEv.pubkey);
    } catch (e) {
      console.error("Failed to parse kind 0 content:", e);
    }
    return;
  }

  let view;
  if (nostrEv.kind === 1) {
    view = postEventView(nostrEv);
  } else if (nostrEv.kind === 6) {
    view = repostEventView(nostrEv);
  } else {
    return;
  }

  if (!view) return;
  if (document.getElementById(nostrEv.id)) return;

  // 新しいイベントをリストの先頭に追加
  if (isFromMore) {
    // 「More」ボタンからのイベントは一番下に追加
    timeline.appendChild(view);
  } else {
    // 新しいイベントはリストの一番上に追加
    timeline.prepend(view);
  }

  // oldestCreatedAt と newestCreatedAt を更新
  oldestCreatedAt = Math.min(oldestCreatedAt, nostrEv.created_at);
  newestCreatedAt = Math.max(newestCreatedAt, nostrEv.created_at);

  if (!profileCache[nostrEv.pubkey] && !pubkeysToFetchProfile.has(nostrEv.pubkey)) {
    pubkeysToFetchProfile.add(nostrEv.pubkey);
    scheduleProfileFetch();
  }
}

// Kind:0 イベントをまとめてリクエストするスケジューラ
function scheduleProfileFetch() {
  if (profileFetchTimeout) {
    clearTimeout(profileFetchTimeout);
  }
  profileFetchTimeout = setTimeout(() => {
    if (pubkeysToFetchProfile.size > 0 && relayWS && relayWS.readyState === WebSocket.OPEN) {
      const pubkeys = Array.from(pubkeysToFetchProfile);
      console.log("Fetching profiles for:", pubkeys.length, "pubkeys");
      relayWS.send(JSON.stringify(["REQ", PROFILE_SUB_ID, {
        kinds: [0],
        authors: pubkeys,
        limit: pubkeys.length // 適切なリミットを設定
      }]));
      // 一度リクエストしたらキューはクリアしても良いが、
      // リレーが全て返さない可能性も考慮し、onEventで個別に削除する
    }
    profileFetchTimeout = null;
  }, 100); // 短い遅延でまとめてリクエスト
}


function subscribeToRelay() {
  // 既存のWebSocket接続があれば閉じる
  if (relayWS) {
    relayWS.removeEventListener("close", onWSClose);
    relayWS.close();
  }
  clearTimeline(); // タイムラインをクリア

  currentRelayUrl = relayInput.value; // 最新のリレーURLを取得
  try {
    relayWS = new WebSocket(currentRelayUrl);
  } catch (err) {
    console.error("failed to connect to relay:", err);
    alert("Failed to connect to relay: " + currentRelayUrl);
    return;
  }

  relayWS.addEventListener("open", function() {
    console.log("Connected to relay:", currentRelayUrl);
    const mainFilter = {
      kinds: [1, 6],
      limit: 50
    };
    if (currentPubkeyFilters.length > 0) {
      mainFilter.authors = currentPubkeyFilters;
    }
    relayWS.send(JSON.stringify(["REQ", MAIN_SUB_ID, mainFilter]));
    isInitialLoad = true;
    initialEvents = [];
  });

  relayWS.addEventListener("message", function(ev) {
    try {
      var r2cMsg = JSON.parse(ev.data);
      switch (r2cMsg[0]) {
        case "EVENT":
          var subId = r2cMsg[1];
          var nostrEv = r2cMsg[2];
          if (!window.NostrTools.verifyEvent(nostrEv)) {
            console.error("nostr event with invalid signature:", nostrEv);
            return;
          }

          const isFromMore = (subId === MORE_POSTS_SUB_ID);

          if (isInitialLoad && subId === MAIN_SUB_ID) {
            initialEvents.push(nostrEv);
          } else {
            onEvent(nostrEv, isFromMore);
          }
          break;

        case "EOSE":
          var subId = r2cMsg[1];
          if (subId === MAIN_SUB_ID) {
            if (isInitialLoad) {
              initialEvents.sort((a, b) => b.created_at - a.created_at); // 新しい順にソート
              initialEvents.forEach(nostrEv => {
                onEvent(nostrEv, false);
              });
              isInitialLoad = false;
              initialEvents = [];
              const firstChild = timeline.firstChild;
              if (firstChild) {
                newestCreatedAt = parseInt(firstChild.getAttribute("data-timestamp"));
                oldestCreatedAt = parseInt(timeline.lastChild.getAttribute("data-timestamp"));
              }
            }
          }
          if (subId === MAIN_SUB_ID || subId === PROFILE_SUB_ID || subId === MORE_POSTS_SUB_ID) {
            loadMoreButton.classList.remove("loading");
            if (subId === MORE_POSTS_SUB_ID) {
              relayWS.send(JSON.stringify(["CLOSE", MORE_POSTS_SUB_ID]));
            }
          }
          break;

        case "OK":
          break; // NIP-20 OK メッセージ
        case "NOTICE":
          console.warn("Relay Notice:", r2cMsg[1]);
          break;
        default:
          console.log(r2cMsg);
          break;
      }
    } catch (err) {
      console.error(err);
    }
  });

  relayWS.addEventListener("close", onWSClose);
}

function onWSClose() {
  console.log("Relay connection closed. Attempting to reconnect...");
  setTimeout(subscribeToRelay, 5000);
}

// イベントリスナー
subscribeRelayButton.addEventListener("click", function() {
  subscribeToRelay(); // リレー接続・購読開始
});

// 「適用」ボタンのイベントリスナー
applyPubkeyListButton.addEventListener("click", function() {
  var pubkeyString = pubkeyListInput.value.trim();
  if (pubkeyString) {
    var newPubkeys = pubkeyString
      .split(/[\s,]+/)
      .map(p => p.trim())
      .filter(p => p.length === 64 && /^[0-9a-fA-F]+$/.test(p));

    if (newPubkeys.length > 0) {
      currentPubkeyFilters = newPubkeys;
      console.log("Subscribing posts for specific pubkeys:", currentPubkeyFilters);
    } else {
      alert("有効な公開鍵（HEX形式）がありません。すべての投稿を表示します。");
      currentPubkeyFilters = [];
    }
  } else {
    currentPubkeyFilters = [];
    console.log("Subscribing all posts from relay.");
  }
  subscribeToRelay();
});


// 初期接続 (ページロード時)
subscribeToRelay();


// create new post (変更なし)
var nsecInput = document.getElementById("nsec");
var postContentInput = document.getElementById("new-post-content");
var sendPostButton = document.getElementById("send-new-post");

function sendNewPost() {
  var nsec = nsecInput.value;
  var content = postContentInput.value;
  if (!nsec || !content) {
    alert("秘密鍵と内容を入力してください。");
    return;
  }

  try {
    var nsecDecoded = window.NostrTools.nip19.decode(nsec);
    if (nsecDecoded.type !== "nsec") {
      alert("Invalid secret key (nsec形式ではありません)。");
      return;
    }
    var seckey = nsecDecoded.data;

    var post = {
      kind: 1,
      content: content,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
    };
    var signedPost = window.NostrTools.finalizeEvent(post, seckey);
    relayWS.send(JSON.stringify(["EVENT", signedPost]));

    postContentInput.value = "";
    alert("投稿を送信しました。");
  } catch (err) {
    console.error(err);
    alert("投稿に失敗しました。エラー: " + err.message);
  }
}
sendPostButton.addEventListener("click", sendNewPost);


// load more posts (フィルターを考慮して修正)
var loadMoreButton = document.getElementById("load-more");

function fetchMorePosts() {
  if (!relayWS || relayWS.readyState !== WebSocket.OPEN) {
    console.warn("Relay not connected.");
    return;
  }
  loadMoreButton.classList.add("loading");

  const filter = {
    kinds: [1, 6],
    limit: 50,
    until: oldestCreatedAt - 1,
  };
  if (currentPubkeyFilters.length > 0) {
    filter.authors = currentPubkeyFilters;
  }
  relayWS.send(JSON.stringify(["REQ", MORE_POSTS_SUB_ID, filter]));
}

loadMoreButton.addEventListener("click", fetchMorePosts);

// 自動更新ON/OFFのチェックボックスのイベントリスナー
autoUpdateCheckbox.addEventListener("change", function() {
  if (this.checked) {
    console.log("自動更新ON. 新しいイベントの受信を開始します。");
    const newMainFilter = {
      kinds: [1, 6],
      limit: 50,
      since: newestCreatedAt + 1
    };
    if (currentPubkeyFilters.length > 0) {
      newMainFilter.authors = currentPubkeyFilters;
    }
    relayWS.send(JSON.stringify(["REQ", MAIN_SUB_ID, newMainFilter]));
  } else {
    console.log("自動更新OFF. 新しいイベントの受信を停止します。");
    if (relayWS && relayWS.readyState === WebSocket.OPEN) {
      relayWS.send(JSON.stringify(["CLOSE", MAIN_SUB_ID]));
    }
  }
});
