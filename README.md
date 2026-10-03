# ZERO ONE ROSTER

## v0.1.24

- 旧Roster写真は JBA ID → 氏名＋生年月日 → 氏名で照合。氏名の空白・文字幅と、ISO日時の日付部分を正規化します。JBA IDが重複する場合は候補内で照合を続け、特定できない写真は保留します。
- DATAに未移行の氏名・理由を表示し、端末に結果を保存します。同じJSONを再取込すると既存playerIdの写真へ上書きします。同一パッケージ内で複数写真が同じ選手を指す場合は保留します。
- 学校名は明示した4表記だけを「大府市立大府西中学校」へ統一します。既存データは起動・取込・同期時に補正し、変更した選手を保存してOneDrive同期対象にします。補正済みデータには再適用しません。
- UIの構成・スタイルを維持しています。

公開後、既存データのある端末でアプリを開き、OneDrive接続後に同期してください。写真はDATAの「旧Roster写真取込」から同じJSONを選択できます。

### 検証

```sh
node --check app.js
node --check store.js
node --check migration.js
node --check onedrive.js
node tests/normalization.test.cjs
node tests/migration.test.cjs
node tests/attendance.test.cjs
node tests/analytics.test.cjs
```
