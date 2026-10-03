# 旧Roster → ZERO ONE ROSTER 移行マッピング

## profile_bb
- name → 選手表示名
- JBA_ID → JBA ID
- kubun → 区分 / category
- name_kana → 氏名カナ
- sintyou → 身長
- birthday → 生年月日
- seibetu → 性別
- taijyu → 体重
- zaiseki → 在籍校
- position → ポジション
- rosuta → ロスター
- yuni_number → ユニフォーム番号 / number
- riba_number → リバーシブル番号
- syuketu → 出欠（旧仕様は "true"/"false" 文字列）
- picture → 写真情報
- license → ライセンス
- communication / DF / handling / 1on1 / 3P / pass / shoot / speed / physical / idea → development
- Notes / memo_data → メモ
- 元レコードは legacy に保持

## practice_bb
genre / menu / naiyou / minutes / Notes → practice record

## communication_bb
name / data / memo → communication record。name と profile_bb.name が一致する場合は playerId を自動関連付け。

## 移行原則
旧SPOは削除・更新しない。JSON取込 → ZERO ONE ROSTERで内容確認 → OneDrive同期の順で移行する。
