# 私辞典

気になった言葉・文章・概念を、出会った場面ごと拾い、育て、忘れたころにまた開くためのローカルファースト辞書アプリ。

## できること

- 見出し語だけで5秒登録
- 意味、出典、出会った場面、使い方、タグを後から追記
- 見出し語以外も含む全文検索
- 辞書を適当に開くようなセレンディピティ表示
- 未閲覧・久しぶり・育て途中・完全ランダムの切り替え
- JSON完全バックアップ／復元
- CSV・TXTのインポート／エクスポート
- NotionのQuoteメモ・キーワード・読書／コンテンツCSVからの移行
- IndexedDBによる端末内保存
- PWA・オフライン利用

## Notionから引き継ぐ

NotionのデータベースをCSVでエクスポートし、「データ」画面の「Notionから引き継ぐ」から複数ファイルをまとめて選択する。

対応する主な列：

- `Name` → 見出し語
- `Tags` / `ジャンル` → タグ
- `元コンテンツ` → 出典名
- `URL` → 出典URL
- `きっかけ` → 出会った場面・保存理由
- `Created` → 元の追加日
- `最終更新日時` → 元の更新日
- `殿堂入り` → お気に入り

ファイル名と列名から、Quoteメモ・キーワード・読書／コンテンツを自動判定する。初期設定ではQuoteメモとキーワードだけを辞書項目として取り込み、読書／コンテンツ本体は任意で追加できる。同じ見出し語の除外も選択可能。

CSVの解析と保存はブラウザー内で完結し、内容をGitHubや外部サーバーへ送信しない。

## 技術構成

- React + TypeScript + Vite
- IndexedDB + Dexie
- MiniSearch
- vite-plugin-pwa
- Vitest
- GitHub Pages

## ローカル起動

```bash
npm install
npm run dev
```

## 検証

```bash
npm run typecheck
npm test
npm run build
```

## データについて

登録内容は既定で外部送信しない。ブラウザー内のIndexedDBに保存する。ただし端末故障やブラウザーデータ削除に備え、JSON完全バックアップを定期的に書き出すこと。

詳細：[`docs/DATA_FORMAT.md`](docs/DATA_FORMAT.md)

## 公開

`main`ブランチへマージするとGitHub Actionsがビルドし、GitHub Pagesへ公開する。リポジトリ設定の Pages > Source は **GitHub Actions** を選択する。
