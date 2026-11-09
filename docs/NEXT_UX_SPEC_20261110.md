# 私辞典｜次期UX開発 仕様書：再会リボンから始める
- 文書種別：プロダクト仕様（PRD）＋UX仕様＋実装受入基準
- 版：v1.0（2026-11-10）
- 対象リポジトリ：https://github.com/silovar-uk/mydictionary
- 現在の公開版：https://silovar-uk.github.io/mydictionary/
- ステータス：**Phase 0 実装済み（PR #21、CI成功）。実機UX確認・GitHub Pagesへの公開反映は別途確認**。Phase 1以降は未実装。
- 関連文書：[UX再設計](./UX_REDESIGN_20261110.md)、[端末間同期](./SYNC_DESIGN.md)、[実行プロンプト](./NEXT_UX_EXECUTION_PROMPT_20261110.md)

## 0. 結論（意思決定ログ）

次の一手は「再会リボン（Reunion Ribbon）」の最小実装。**登録時に過去の同じ表記の記録を見せるが、保存を妨げない**。Phase 0ではDBスキーマ・同期ペイロード・JSONバックアップの変更を一切行わない。

判断根拠：
1. 同じ見出し語を複数回保存できるが、現状の登録画面は過去の反応を示さない。
2. 既存 `DictionaryEntry.normalizedHeadword` と `normalizeText` を利用し、追加検索基盤なしで検証可能。
3. 「重複検知」に見せかけた上書き・統合は個人の記録を失う。重要なのは重複削減ではなく、繰り返し関心を持った事実の提示。
4. 本格的な「再会履歴」は魅力的だが、将来の同期互換・復元・削除管理が広範囲に及ぶ。価値が実証される前にデータモデルへ投資しない。

**採用しない案（現時点）**
- 同じ文字列を自動的に重複削除する。
- AIで類義語や同一概念を推測して自動統合する。
- 過去の内容を勝手に現在の入力欄へ差し込む。
- 登録完了前に確認ダイアログを強制する。
- 言葉同士を機械的に結び付ける「ことばの橋」を先に全面実装する。

## 1. 課題・目的・検証仮説

### 1.1 現状の事実
- `src/services/entries.ts` の `createEntry` は空欄・文字数を検証するが、同じ見出し語の登録を禁止しない。
- `src/domain/normalize.ts` の `normalizeText` はNFKC正規化、大小文字統一、カタカナ→ひらがな、空白整理を行う。
- `src/db/database.ts` は `normalizedHeadword` を索引として保持する。
- `src/components/QuickAdd.tsx` と `src/pages/AddPage.tsx` が主要な単語登録導線。
- `src/services/sync.ts` はEntry IDごとに差分を統合する。異なるIDの同名見出し語は別の記録として扱う。
- `src/services/transfer.ts` はv1形式のJSONバックアップを作成・復元し、設定情報も扱う。

### 1.2 目的
過去の同じ見出し語の記録と、今日の新しい反応を比較できるようにし、**検索せずとも過去の自分の関心に自然に気づく**体験を作る。なお、保存という主要タスクの完了率と安心感を下げない。

### 1.3 仮説の区別
- 事実：同名語が複数残り得る。
- 解釈：異なる時点・出典からの同名語は、関心の変化を考える手掛かりになり得る。
- 未検証の仮説：過去記録の提示によって意味の追記や再閲覧が増える。
- 禁止する飛躍：「同じ表記＝同じ概念」「二度登録＝思考が進化した」「リボン表示＝良い驚きが発生した」。

## 2. 対象ユーザー・主要シナリオ

1. **移動中のメモ（スマホ）**：未知語を入力し、最短で保存。過去にある場合は静かに知らせる。
2. **読書中の記録（PC）**：本文から言葉を拾い、過去のメモ・出典を見比べて新たに保存。
3. **同音異義・多義語**：同じ表記だが内容が別。警告せず独立登録できる。
4. **大量の類似記録**：同じ語が10件以上ある。最新数件を示し、「ほかを見る」で展開する。
5. **オフライン／同期中**：通信に依存せず、ローカルにある過去記録のみ表示。UI上で「すべての端末を確認した」とは言わない。

## 3. 実装スコープと順序

### Phase 0：Read-only Reunion Ribbon（最初のPR）
**In scope**
- `QuickAdd` と `AddPage` の入力欄近くに過去の同表記の記録を表示。
- 表記正規化一致のみ。入力途中はチラつかせない。
- 各候補は「以前の記録を見る」動線を持つ。
- 保存は現在の実装どおり新規IDで実行できる。候補を見たこと・見なかったことでデータは変わらない。
- 候補が多数の場合は3件を最初に表示し、残りを展開（スクロールや閉じるで邪魔しない）。
- スマホとPCの応答性、画面読み上げ、キーボード操作を検証。
- 既存データを読み取るだけで、新規フィールド・新規API・DB変更をしない。

**Out of scope**
- 既存エントリーへの自動追記・統合、意味推定、AI推薦、履歴テーブル、共有リンク公開。
- `OpenPage` の全面改造、2ペイン化、分析データ外部送信。

### Phase 1：Two-pane Review（別PR）
- PC（概ね幅1100px以上）：左側に検索結果、右側に選択した記録の詳細。
- 一覧の検索・絞り込み・位置を維持、詳細切替時のフォーカス移動とスクロールを明示。
- 変更途中の離脱確認／下書き保全、スマホは既存のシート型詳細を維持。
- リボンから過去記録を開く時に、書きかけの新規フォームを失わない導線を統合。

### Phase 2：Encounter History（検証後・設計審査を要する）
- 一つの言葉に複数の出会いを紐付ける。実現価値を測定後に採否判断。
- EntryとEncounterを独立エンティティにするか、関連テーブルにするかをADR（Architecture Decision Record）で比較。
- Dexieの次版スキーマ、既存データ移行、暗号化同期ペイロードの互換性、JSONバックアップの後方互換、削除/復元、重複端末での競合解消を**実装前に設計**。
- 「重複＝履歴」の自動移行はしない。ユーザーの選択がある場合のみ関連付ける。

### Phase 3：Research-by-Context / Unexpected Pair（任意）
- 出会った場面、出典、保存した時期からの検索導線。
- 「ことばの橋」は、驚きの有用性が測れた場合のみ探索する。

## 4. Phase 0：画面・操作仕様

### 4.1 発火条件
- ユーザーが見出し語を入力し、IME変換の確定後に（または入力が落ち着いた後に）同表記候補を照会。
- 対象文字列：`normalizeText(currentHeadword)` の結果が空でないこと。
- 一致条件：`entry.normalizedHeadword === normalizeText(currentHeadword)` の**完全一致**。部分一致、あいまい一致、意味類似は使わない。
- `deletedAt` が空でないものは既定では表示しない。完全削除済みは表示できない。
- 候補は `createdAt` の新しい順、同日時ならID安定順。
- 異言語・異義の可能性を考慮し、「同じ言葉」ではなく**「同じ表記の記録」**というラベルを使う。
- local IndexedDBの候補数がゼロならリボン自体を表示しない。ネットワークがなくても同様。

### 4.2 UIコピー（初期案）
- 見出し：**「以前にも、この表記を拾っています」**
- 補足：**「同じ意味とは限りません。過去の記録を見てから、今の言葉も保存できます。」**
- 1件表示：見出し語、登録日、`shortMeaning` または `whySaved` / `encounterContext` の短い抜粋、出典名（存在する場合）。
- ボタン：**「前の記録を見る」**。候補が4件以上なら **「ほかの記録も見る（N件）」**。
- 保存ボタンは元の画面のまま。**「重複しています」「上書き」など脅かす語を使わない**。
- 候補を閉じた場合は当該画面で再表示を強制しない。見出し語が変われば再評価可能。

### 4.3 状態
- `empty`：入力なし→非表示
- `composing`：IME未確定→候補更新を一時停止
- `checking`：照会中→通常は古い候補を残さず、小さな候補領域だけ安定させる
- `no-match`：0件→非表示
- `matched`：1件以上→リボン表示、最大3件を先に表示
- `expanded`：残り件数を展開
- `dismissed`：現行入力セッションでは非表示
- `error`：読み取りエラー→保存は続行可。候補表示のために登録を無効化しない

### 4.4 インタラクション
1. 登録画面で「余白」と入力。
2. 同表記の過去記録が存在すれば、入力欄直下または脇に控えめなリボンが現れる。
3. 過去の記録を見る場合：QuickAddは入力値を失わず、詳細の開閉を可能にする（実装手段は状態管理と既存EntrySheetを検討）。AddPageは**既存の下書きを即時保全してから**詳細閲覧へ進む。
4. そのまま保存した場合：既存 `createEntry` を呼び、別IDの新規記録として保存。過去記録は一切変更しない。
5. 端末内に候補がなくても、同期後に候補が増えた場合はUIの再評価で反映される。実際にその画面を開いている間の同期通知ハンドリングを検証する。

### 4.5 レスポンシブ
- 320–767px：入力欄の下にインラインカード。本文・保存ボタンを画面外へ押しやりすぎない。タップ領域は十分な大きさを確保する。
- 768–1099px：入力欄近くに1〜3件、必要なら折り畳み。
- 1100px以上：既存の書斎UIに自然になじませ、入力とリボンを並置してもよい。ただし視線が頻繁に往復しない位置を優先。
- 横スクロール発生・過剰な位置移動・入力欄の再マウントによるフォーカス消失は不可。

### 4.6 アクセシビリティ
- `aria-live="polite"` は候補数など必要最低限。日本語入力のたびに全文読み上げを起こさない。
- キーボード：Tabで候補へ移動、Enter/Spaceで開く、閉じて入力に戻れる。
- ネイティブダイアログを使う場合はWAI-ARIA APGに従い、Escとフォーカス復帰を確認。
- `prefers-reduced-motion` を尊重。強い点滅・過度なアニメーション禁止。
- 動画や派手な演出を使わず、テキストとタイポグラフィで「再会」の驚きを作る。

## 5. Phase 0：技術・データ仕様

### 5.1 再利用
- `normalizeText`：既存の正規化ロジックを使用。新しい独自ルールを作らない。
- `DictionaryEntry`：既存レコードを読み、`id/headword/normalizedHeadword/shortMeaning/whySaved/encounterContext/sourceTitle/createdAt/deletedAt` を利用。
- `QuickAdd` / `AddPage`：リボンの共通コンポーネントを埋め込む。
- `useDictionaryData` / `db.entries`：既存データ取得を活用。読み取りが重い場合のみ索引を使った問い合わせに切り替える。

### 5.2 推奨分割
- `src/domain/reunion.ts`：純粋関数 `findSameSpellingEntries(entries, currentHeadword)`。見出し語正規化、削除除外、並べ替え、件数計算。
- `src/components/ReunionRibbon.tsx`：画面表示と候補展開。データ保存・同期を担当しない。
- `src/components/QuickAdd.tsx` / `src/pages/AddPage.tsx`：入力状態との接続。
- `src/domain/reunion.test.ts` と UIテスト：正規化、候補、例外、アクセス、保存回帰を検証。

### 5.3 擬似インターフェース
```ts
type ReunionCandidate = Pick<DictionaryEntry,
  'id' | 'headword' | 'createdAt' | 'shortMeaning' |
  'whySaved' | 'encounterContext' | 'sourceTitle'
>;

function findSameSpellingEntries(
  entries: DictionaryEntry[],
  currentHeadword: string,
  excludeEntryId?: string
): ReunionCandidate[];

interface ReunionRibbonProps {
  candidates: ReunionCandidate[];
  onOpenPrevious: (entryId: string) => void;
}
```
- IDベース参照のみで共有・結合を推論しない。
- 全件メモリ走査が負荷なら、`db.entries.where('normalizedHeadword').equals(key)` と `deletedAt` フィルタへの変更を検討する。先に性能計測し、複雑化が合理的な場合に限る。
- 200ms程度のデバウンスは仮説的な初期値。IME確定を最優先し、体感応答と負荷で調整。
- 既存の登録・更新APIには手を入れない。

### 5.4 データ保護・同期
- **Phase 0にDBマイグレーションは不要**。`src/db/database.ts` のver.2、Entry schema、sync `Payload`、バックアップ `formatVersion:1` を変更しない。
- 候補はローカルの同期済み記録。未到着の別端末の項目は検索対象にならない。
- リボンの候補照会と登録確定が競合しても、候補はヒントに過ぎず、登録は既存処理に従う。
- 既存の同期はentry IDごとに統合するので、同表記の新規IDは別記録として残す。
- 個人的なメモや検索語を新たな外部分析基盤に送信しない。
- バックアップの復元・同期解除UIは今回の対象外。バックアップ取得を破壊しない。

## 6. 受け入れ基準（テスト可能な条件）

**AC-01** 新規語：一致ゼロなら余計な警告が出ず、保存できる。
**AC-02** 正規化：全角英数字／大小文字／カタカナ・ひらがなの既存ルールに沿った完全一致が候補になる。
**AC-03** 別概念：同表記の候補が表示されても、別IDで自由に保存できる。
**AC-04** 既存不変：候補を表示・展開・閉じても、既存エントリーの`updatedAt`、`revision`、内容は変化しない（閲覧記録の更新は既存仕様であれば別途区別）。
**AC-05** 複数：候補が10件あっても3件から始まり、全件確認できる。表示順は安定している。
**AC-06** 削除済み：`deletedAt` のある項目は初期候補に出ない。
**AC-07** 下書き：候補詳細を開閉してもQuickAddとAddPageの入力途中データが保護される。
**AC-08** IME：日本語変換中に候補がちらつかず、確定後に正しく表示される。
**AC-09** オフライン：ネットワークを切っても候補表示と新規保存が機能する。
**AC-10** 同期：同表記の言葉をPCとスマホで別々に保存して同期したとき、双方の項目が失われず、再会候補になる。
**AC-11** アクセシビリティ：キーボードとスクリーンリーダーで候補・保存が操作でき、フォーカスが迷子にならない。
**AC-12** レスポンシブ：320/390/768/1100/1440/1920pxで横スクロールや保存ボタンの遮蔽が発生しない。
**AC-13** 大量データ：項目数100、1000、10000の環境で入力遅延を計測し、登録の体感速度が悪化する場合は索引照会へ切り替える。
**AC-14** 後方互換：現行JSONのエクスポート／インポート、PWA、同期、登録、検索が回帰しない。
**AC-15** 空欄・例外：空文字、空白のみ、10,000字の見出し語、ストレージ取得失敗でも保存可能性とエラーメッセージが適切。

## 7. 評価設計

### 7.1 最小の観察テスト
- 初めての見出し語を拾う。
- 保存済みと同じ表記を再び拾う。
- 同音異義の例をあえて登録する。
- 過去のメモを見て、前後の文脈を比較する。
- モバイルで片手登録し、PCで見返す。

各タスクで完了可否、完了時間、迷いの箇所、再会の価値に関する発話、データ喪失の不安を記録。対照条件（リボンなし）との比較ができるなら優先する。

### 7.2 評価指標
- ガードレール（最優先）：保存完了率、保存までの時間、入力中断率、失われたデータ件数（許容0件）。
- 利用価値：同表記候補の閲覧率、閲覧後の新規記録率、過去記録を再閲覧した割合。
- 主観評価：「同じ表記があったことが役に立ったか」「邪魔だったか」「気づきが生まれたか」。
- 目標値はベースライン取得後に設定する。数値を架空の実績として書かない。
- ログは原則ローカル・匿名・必要最小限。個々の見出し語・本文・出典内容の外部送信は禁止。

### 7.3 Go/No-Go
- Go：回帰がなく、保存負荷を増やさず、観察上で過去の文脈への自然な再訪が確認できる。
- 再設計：候補が多すぎる、登録が遅くなる、比較する意義が理解されない。
- Stop：入力データ破損・同期上書き・復元不能が発生した場合は実装を止め、原因と復旧を優先。

## 8. 実行計画（最初に取る一手）

1. **検証用の3件を用意**：「余白」を仕事の意味で記録、別の文脈で記録、まだ保存していない語を用意。本人の実データは使わずfixtureで検証。
2. **既存操作の回帰テストを先に作成**：QuickAddとAddPageの見出し語だけ保存、編集画面遷移、下書き、端末同期。
3. **一致検知を純粋関数で実装**：まず同表記の候補だけ返す。表示ロジック・保存ロジックは分離。
4. **リボンを実装**：入力に重ならない表示、詳細への非破壊導線、候補多数の折り畳み、キーボード。
5. **実装後に再リサーチ**：試して生じた新たな問題に対し、識別できる事実・仮説・優先順位を更新。
6. **CI＋ブラウザ検証**：typecheck／Vitest／build、PC・スマホ実機。同期・バックアップを必ず確認。
7. **段階的に公開し観察**：Phase 1/2へは実利用データとADRによる安全審査で進む。

## 9. 調査対象・リファレンス
- [MyDictionary entries.ts](https://github.com/silovar-uk/mydictionary/blob/main/src/services/entries.ts)
- [MyDictionary normalize.ts](https://github.com/silovar-uk/mydictionary/blob/main/src/domain/normalize.ts)
- [MyDictionary db/database.ts](https://github.com/silovar-uk/mydictionary/blob/main/src/db/database.ts)
- [MyDictionary sync.ts](https://github.com/silovar-uk/mydictionary/blob/main/src/services/sync.ts)
- [MyDictionary QuickAdd.tsx](https://github.com/silovar-uk/mydictionary/blob/main/src/components/QuickAdd.tsx)
- [MyDictionary AddPage.tsx](https://github.com/silovar-uk/mydictionary/blob/main/src/pages/AddPage.tsx)
- [Nielsen Norman Group: Recognition and Recall](https://www.nngroup.com/articles/recognition-and-recall/)
- [W3C WAI-ARIA: Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Dexie: Versioning](https://dexie.org/docs/Version/Version)

## 10. 非機能・リリースゲート
- コピーの一貫性：「同じ表記」「前の記録」「今日の出会い」。ユーザーの意図や変化を断定しない。
- UX：不意の確認ダイアログ、強制入力、保存前のネットワーク要求は不可。
- 性能：候補検索に無制限の再レンダリング／毎キー入力の全件再検索を持ち込まない。
- セキュリティ：候補をサーバー送信しない。同期鍵や共有リンクを公開ログへ含めない。
- 保守：Pure domain logic、read-only component、既存create/save flowを分離。
- 各Phaseは別PRで実装し、ユーザーのデータに触れる変更はバックアップ・復元・同期に関する追加テストを必須とする。

## 11. Phase 0 実装記録（2026-11-10）

- PR：[実装PR #21](https://github.com/silovar-uk/mydictionary/pull/21)
- 再会候補判定：`src/domain/reunion.ts`、`src/domain/reunion.test.ts`
- UI：`src/components/ReunionRibbon.tsx`、`src/styles/reunion.css`
- 接続：`src/components/QuickAdd.tsx`、`src/pages/AddPage.tsx`、`src/pages/TodayPage.tsx`、`src/components/EntryFormFields.tsx`、`src/App.tsx`
- キーボード復帰：`src/components/EntrySheet.tsx` の初期フォーカス、Escape、Tab循環、閉じた後のフォーカス復帰
- 保全テスト：`src/services/sync.test.ts` に同表記・異なるIDの別端末マージ試験を追加
- Phase 0は**閲覧だけ**。保存API・DB version・Entry構造・同期Payload・JSONバックアップ形式の変更なし。
- **CI**：型チェック・Vitest全テスト・ビルド成功。これは実機上の動作確認を意味しない。

### 受け入れ結果の区別
- 自動テスト確認：AC-01（空欄/候補なし）、AC-02（正規化）、AC-03（別IDで独立）、AC-04の候補判定の非破壊性、AC-05（多数と順序）、AC-06（削除済み除外）、AC-10の独立IDのマージ。
- 実装コードで対応、実機確認は未完：AC-07（入力中の過去記録閲覧）、AC-08（IME）、AC-09（オフライン）、AC-11（キーボード/スクリーンリーダー）、AC-12（各画面幅）。
- 一部のみ検証：AC-13（10,000件のロジックは試験したが、描画の体感速度の計測は未実施）、AC-14（CIでの回帰は検証したが、端末間同期とJSON復元の実機E2Eは未実施）、AC-15（保存処理を変えていないが、実データ取得失敗時の手動検証は未実施）。
- 詳細閲覧では、既存仕様どおり閲覧回数を更新する場合がある。「リボンを表示しただけ」は既存記録に書き込まない。

### 安全確認と残課題
- 候補の内容はローカルの`entries`配列から抽出し、リボンのためのネットワーク呼び出しはない。
- 同一表記の記録は意味が異なり得るため、UIは**「この表記」**と表現する。
- QuickAddの案内を保存操作の後ろに配置。AddPageでは入力欄の下に配置し、入力中の下書きを閲覧直前に保存。
- Phase 1/2への着手は実利用による登録時間・利用価値・安全性の観察を踏まえて判断。
