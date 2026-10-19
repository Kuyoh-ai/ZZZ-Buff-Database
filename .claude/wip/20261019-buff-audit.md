# WIP: 全キャラのバフデータ監査(コミット前チェック)

- 作成日: 2026-10-19
- status: done(ユーザー回答を反映済み)
- 元の依頼: コミットと push の前に念のため全キャラクターの能力について改めて齟齬がないかチェック。特に自バフとパーティバフの境界が曖昧なものについて判断に迷う場合は、要確認として自己判断せず確認対象に整理する

## 方法

- HoYoWiki の公開 API から全エージェント 60 体 + 音動機 102 件の本文をダンプし(`scripts/fetch-hoyowiki.py`)、各 `src/data/buffs/<id>.json` と `characters.json` の追加能力条件を原文と突合。4 並列(15 体ずつ)で監査し、親側で横断チェック(target と note の表現の食い違い、二重計上、M 段階の値の逆転)を追加
- 規約: 値は上限値、コアは最大段階、M1〜M6 は実効値、音動機は加算、追加能力は name に「追加能力」。「〇〇%無視」は自身の攻撃限定なら self。「防御力無視」は `enemy_def_down_pct`(防御ダウンと同枠)、貫通率とは別
- ポテンシャルは HoYoWiki に無いものが多く、`potential.md` と矛盾しないことのみ確認

## 修正済み(明確な誤り。原文と規約から一意に決まるもの)

| キャラ | 修正 |
|---|---|
| nekomata | コア与ダメの継続時間 40s → 6s。M1 物理耐性無視(自身の攻撃限定)を enemy → self |
| koleda | コアのブレイク値 base 30 → 60(最大段階) |
| caesar | M1 の名称を原文「楔形陣形」に。コア note の段数表記を Lv1〜7 に |
| pulchra | 追加能力の stat を支援攻撃ダメ → 追加攻撃ダメ(原文『追加攻撃』) |
| hugo | M2 防御無視 / M4 氷耐性無視 / 音動機の防御無視(自身の攻撃限定)を enemy → self |
| banyue | M1「戦慄」敵への効果を 敵被ダメ増加 → 盤岳自身の与ダメ(self)。音動機「炎属性の透徹ダメージ」を属性ダメ → 透徹ダメージ(別枠) |
| dialyn | コア衝撃力「最大 +100Pt」を impact_pct → impact_flat。M2「全ユニットの与ダメ +15%」を敵被ダメ増加 → 与ダメ(target enemy)。原文に無い「ブレイク時」条件を削除 |
| promeia | M6 全属性耐性無視(自身の異常/混沌ダメージ限定)を enemy → self |
| norma | 追加能力由来の 2 件(攻撃力 +870 / チーム与ダメ +20%)の name に「追加能力」を付与(トグル対象化)。コア note の「貫通率」→「透徹力」、M2 note の連携 → 通常攻撃 |
| pyrois | 音動機のエーテル耐性無視(装備者限定)を enemy → self |
| velina | 竜巻の蓄積耐性ダウン 14 をコア 7 + 追加能力 7 に分離(追加能力 OFF でコア分が消えていた) |
| roxy | 追加能力 2 件の note「他のメンバー」→「チーム内のメンバー」 |
| vivian / aria / yanagi | 「異常マスタリー+」の 4 件が異常掌握(anomaly_mastery)で収録されていたのを異常マスタリー(anomaly_proficiency)に |
| alice | 音動機の name「異常マスタリー」→「異常掌握」(stat は正しかった) |
| yuzuha | 追加能力の蓄積効率から M1 26 を削除(M1 の 130% は状態異常/混沌ダメージ側のみ) |
| yidhari | 音動機「氷属性の透徹ダメージ」を属性ダメ → 透徹ダメージ(別枠) |
| rina | 音動機のチーム与ダメ上限を「初期値 + 追加分上限」の合計に(P1〜P5: 20.2 / 24.5 / 30 / 35.5 / 39.8。従来は追加分の上限のみ) |
| lycaon | 音動機の与ダメ(『通常攻撃』限定)を dmg_pct → basic_dmg_pct |
| qingyi | M1「閃絡電圧」の蓄積効率 +30% は固有リソースのため削除(unresolved へ)。コア弱体倍率に M2 の 135%(1 重 5.4)を追加 |
| zhu_yuan | コア与ダメをブレイク中込みの上限 80 に。コアスキル強化ステータス(攻撃力 +75 / 会心ダメ +28.8)のエントリは agent_stats.json 側で持つため削除(比較計算で二重計上していた) |
| cissia | コア「チーム全体が敵に与える電気属性ダメージの防御無視」を self → team(受け手: 電気属性) |
| orphie | コア『追加攻撃』与ダメを支援攻撃 → 追加攻撃ダメ。追加能力と音動機の「防御無視」を pen_ratio → enemy_def_down_pct |
| seed | 「正規兵」バフ 2 件に excludeSelf(自身の self エントリと二重計上)。追加能力の電気耐性無視(自身のスキル限定)を enemy → self。M2 と音動機の「防御無視」を pen_ratio → enemy_def_down_pct |
| soldier_11 | 追加能力の炎ダメをブレイク中込みの上限 32.5 に |
| trigger | 追加能力「追加攻撃のブレイク値 +75%」を衝撃力 → 与ブレイク値 |
| pan_yinhu | 「全ユニットがその敵に与えるダメージ +20%」を敵被ダメ増加 → 与ダメ(target enemy)。name「貫通力」→「透徹力」 |
| ye_shunguang | M1/M2 の「防御無視」を pen_ratio → enemy_def_down_pct |
| aria | M2 の「防御無視」2 件を pen_ratio → enemy_def_down_pct(self) |
| grace | 追加能力の発動条件にポテンシャル解放後の「他の[異常]」を追加(クレタと同形式、activation.potentialRoles) |
| anton / nicole | note の条件・継続時間を原文に合わせて補正(値は変更なし) |

## 要確認(自己判断していないもの)

### 1. 自バフ / パーティバフの境界(target の選び方)

| # | キャラ・エントリ | 原文の受け手 | 現在 | 選択肢 |
|---|---|---|---|---|
| Q1 | astra `astra_core_atk_swap` | 「アストラ自身と出場メンバー」の攻撃力 +1200 | team(note で簡易化と明記) | team のまま / self + next_swap_in の 2 件 |
| Q2 | caesar コア・M2 の攻撃力 +1000/+500 | 「栄光の盾」の所持者(操作中のメンバー) | team | team のまま / 出場メンバー限定の表現 |
| Q3 | seth `seth_core_anomaly_proficiency` 異常マスタリー +100 | 「断固たる盾」の所持者(クイック支援/連携で交代したメンバー) | team | team のまま / next_swap_in / self 併記 |
| Q4 | soukaku `soukaku_core_self_atk` 攻撃力 +1000 | 自身。交代時は次の出場メンバーに引き継ぐ | self | self のまま / self + next_swap_in |
| Q5 | ben `ben_additional_team_crit_rate` 会心率 +16 | 「守護」のシールド継続中のエージェント(盾はメンバー全員に付与) | team | team のまま / 所持者限定 |
| Q6 | lighter `lighter_m4_energy_regen` | 「ライトが控えにいる時、出場中のメンバー」 | team + excludeSelf | そのまま / 出場メンバー限定 |
| Q7 | norma `norma_m4_decibel_gain` デシベル 200 | 「ノルムーと対応メンバー」(連携を発動したメンバー) | self | self のまま / self + 相手の 2 件 |
| Q8 | dialyn `dialyn_m1_res_ignore` 全属性耐性無視 15 | 「好評の嵐」状態のメンバー(メンバー全員に付与) | team | team のまま |
| Q9 | anby `anby_m4_team_electric_energy` EN 3 | 「控えの電気属性メンバー」 | team + electric + excludeSelf | そのまま / 控え限定の表現 |
| Q10 | seed 正規兵バフ(攻撃力 +1000 / 会心ダメ +30 / M2 防御無視 20) | 「正規兵」= シードを除く開幕攻撃力最高の強攻 1 名 | team + roles attack + excludeSelf | 近似のまま |
| Q11 | pan_yinhu `pan_yinhu_sheer_force_assist` 透徹力 | クイック支援/連携で入場した次のメンバー | next_swap_in | そのまま。M6「最大 720」が合計か追加分かも要確認 |

### 2. 「敵に紐づく全員バフ」を team と enemy のどちらにするか(方針の統一)

今日シーザーで「デバフを付与された敵に対しメンバー全員の与ダメ +25%」を target enemy(stat は与ダメ)としたが、同型のエントリは team のものが多い。計算上は team も enemy も全員に乗るため結果は同じで、違いは一覧の見え方(enemy は「敵へのデバフ」として表示)と excludeSelf の要否。

| # | キャラ・エントリ | 原文 | 現在 |
|---|---|---|---|
| Q12 | nicole `nicole_additional_team_ether_dmg` | デバフ付与敵に全ユニットのエーテルダメ +25% | team |
| Q13 | nicole `nicole_m6_team_crit_rate` | 力場の対象に対し全ユニットの会心率 +1.5×10 | team |
| Q14 | koleda `koleda_additional_team_chain_dmg` | デバフ付与敵への『連携スキル』与ダメ +35×2 | team |
| Q15 | burnice `burnice_m2_team_pen_ratio` | 「貫く熱意」の敵への味方攻撃の貫通率 +4×5 | team |
| Q16 | lighter `lighter_wengine_crit_dmg` | 「衰耗」の敵への氷/炎ダメの会心ダメ | team + elements |
| Q17 | pulchra `pulchra_additional_team_aftershock_dmg` | 「囚縛」の敵に対し全味方の追加攻撃与ダメ +30 | team |
| Q18 | rina `rina_wengine_weeping_cradle_team_dmg` | 全ユニットのターゲットへの与ダメ | team |
| Q19 | cissia `cissia_m1_electric_res_ignore` | メンバー全員の与ダメージが電気耐性 5% 無視 | team |
| Q20 | miyabi `miyabi_core_chaos_buildup_team` | 「霜灼」状態の敵への全ユニットの蓄積値 +20 | team |
| Q21 | yanagi `yanagi_m4_team_pen_ratio` | 「暴露」の敵を攻撃した時その攻撃の貫通率 +16 | team |
| Q22 | soldier_0_anby `soldier_0_anby_aftershock_dmg_silver_star` | アンビー操作中、「銀星」の敵へのメンバー全員の追加攻撃与ダメ +25 | team |
| Q23 | lucia `lucia_m1_res_ignore` | 「夢巡りの童謡」状態にある時、敵の全属性耐性 18% 無視 | enemy |

提案: いずれも「誰の攻撃にも乗る」ので現状維持(team)でよく、シーザー/ダイアリン/潘引壺の 3 件(stat 変更に伴い enemy のまま)もそのままで実害なし。統一したい場合は方針を一言ください。

### 3. 「〇〇%無視」が自身限定か敵デバフか原文から決め切れないもの(現在 enemy)

| # | キャラ・エントリ | 原文 |
|---|---|---|
| Q24 | vivian `vivian_m2_res_ignore` 全属性 15 | 「狂咲」がターゲットの全属性耐性を無視(ビビアンの狂咲のみ?) |
| Q25 | velina `velina_m1_enemy_res_ignore` 全属性 20 | ヴェリナが「乱流」を発動させた時、ターゲットの全属性耐性を無視 |
| Q26 | remielle `remielle_m1_enemy_res_ignore` 全属性 50 | レミエールが「耀変」で敵にダメージを与えた時、全属性耐性を無視 |
| Q27 | aria `aria_m1_enemy_anomaly_buildup_res_down` エーテル蓄積耐性 10 | アリアがダメージを与えた時、ターゲットの蓄積耐性を無視 |
| Q28 | jane_doe `janedoe_m2_def_ignore` 防御 15 | ジェーンの攻撃が噛み傷の敵に命中、または任意のメンバーが強撃を発動した時、防御を無視 |
| Q29 | sigrid `sigrid_core_break_stun_mult` 弱体倍率 +20 | シグリッドの攻撃がブレイク状態の敵に命中した時、ターゲットへのダメージの弱体倍率 +20% |

提案: Q24〜Q27 は「〇〇が発動した時」= 本人のダメージ限定と読めるので self が妥当。Q28 は本文が曖昧、Q29 は self が妥当。回答があれば一括で直します。

### 4. 単位不一致(効率 % を固定 Pt の stat に入れている)

- エネルギー獲得効率 → `energy_regen`(Pt/秒): anby M1 +12%、nekomata M2 +25%、grace M4 +20%、lighter M4 +10%、pyrois コア +15%
- デシベル獲得効率 → `decibel_gain`(Pt): lucia M1 +5%、sigrid M2 +10%、seed M4 +10%、dialyn M1 高評価獲得量 +16%(高評価は固有リソース)

選択肢: (a) `energy_gain_eff_pct` / `decibel_gain_eff_pct` を新設して移す、(b) 削除して unresolved へ、(c) そのまま。ダメージ比較には影響しない。

### 5. 「ダメージ倍率 +X%」を与ダメ枠で収録しているもの(過大評価の可能性)

- alice `alice_core_disorder_dmg_self` 混沌ダメージ倍率 +18%/秒 最大 +180%(disorder_dmg_pct 180)
- yuzuha `yuzuha_m6_disorder_dmg` 混沌ダメージ倍率 +105%×3(disorder_dmg_pct 315)
- yanagi `yanagi_core_disorder_dmg` 混沌効果のダメージ倍率 +250%(disorder_dmg_pct 250)

規約では「ダメージ倍率+」はスキル倍率として未収録。混沌の基礎倍率 450% に対する加算と読めるので、混沌ダメージ% とは別物(混沌モードの比率で過大)。選択肢: 削除して unresolved へ / 別 stat(混沌倍率加算)を作る / そのまま。

### 6. 「スキルの与ダメージ +X%」なのに倍率扱いで未収録になっているもの(逆のケース)

- anton コア 杭打ち +24% / ドリル +40%、caesar M6 該当スキル +50%、orphie M4 強化特殊/終結 +40%、banyue M4 特定スキル +30%、yixuan 追加能力 ブレイク中の強化特殊 +30%、seed 追加能力 特定通常/終結 +30%、hugo 追加能力 連携 +15%(通常エネミーにさらに +35%)/累算とどめ +40%、lucia M2『合唱』+15%、cissia M2 通常 +35%、miyabi M4 霜灼・破 +30%、soukaku M6 +45%、ellen M6 +250%(単発)、piper M2 落下攻撃 物理 +40%

いずれもスキル限定の与ダメ。収録するなら `basic/ex/ult/chain_dmg_pct` 等の self エントリ(攻撃種別セレクタで効く)。収録方針を決めてください。

### 7. 固有の会心値を自身の会心ステータスとして収録しているもの

- jane_doe コア: 強撃の会心率 40 / 会心ダメ 50、M2 強撃会心時 +50
- aria M1: 狂咲の初期会心率 25 / 会心ダメ 25

状態異常/狂咲そのものの会心値であり、キャラ全体の会心バフではない。次バージョンの「異常会心」と組み合わせる際の扱いも含めて方針が要る(削除して note に留める / 異常会心トグル ON のときだけ使う別枠にする)。

### 8. その他の方針

- A 級キャラのモチーフ音動機: characters.json は "-" で全 8 体未収録(anby / billy / nicole / anton / lucy / piper / pulchra / corin / seth / soukaku / manato / pan_yinhu)。パーティ向けはニコ(全ユニット与ダメ +15〜24%)、ルーシー(チーム攻撃力 +2.5〜4%×4)、蒼角(チーム攻撃力 +2〜3.2%×4)。収録するか
- yidhari `yidhari_core_ice_pen_ratio`(pen_ratio 100): 「氷ダメージは透徹ダメージとみなされ防御を無視」。透徹ダメージの式が既に防御枠なしのため計算では二重。削除してよいか(真斗には同種エントリなし)
- burnice `burnice_core_ex_dmg_from_mastery` 与ダメ +30 は「エンバー」(支援攻撃扱い)限定。dmg_pct/self のままだと全攻撃に効く。assist_dmg_pct にするか
- manato `manato_m1_fire_dmg`: 支援突撃/通常攻撃限定の炎ダメ +20 を全炎ダメとして収録
- promeia: コアの異常掌握超過変換(係数 1.5Pt / 0.35% を base にしている)、追加能力の防御無視 40 は狂咲ダメージ限定
- koleda / roxy: 「[鋭御]以外のメンバー」「[鋭御]でないメンバー」を除外する condition が無い(現在は全員に乗る)
- remielle 特殊スキルのチーム与ダメ 18 はスキル Lv12 の値(M3/M5 で 21/24)。lucia の透徹力 base 1008 は Lv16 の値。スキルレベル依存値の収録基準
- burnice ポテンシャル T2〜T6 の段階対応(原文は上限のみ)、lycaon ポテンシャル衝撃力の段階(T2 開始の根拠なし)、rina ポテンシャル(potential.md の記述が自己矛盾)
- unresolved.md の古い記述は今回の監査で更新済み(HoYoWiki で確認できた音動機 P1〜P5 等)。potential.md の grace / burnice / soldier_11 / soldier_0_anby の「数値未確認」は古い(HoYoWiki に数値あり)

## 未収録候補(数値化できるが現在 JSON に無いもの。方針決定後に追加)

- 入場時デシベル: astra M1 1000、evelyn M1 1500、pyrois M1 1000 / M2 1500、aria M6 1200。ju_fufu 追加能力の[強攻]/[命破]終結時デシベル 300(team)
- banyue コア 入場時アドレナリン 60、astra 音動機 EN 回復 5〜7Pt/5 秒、lighter M4 控えメンバー EN +5
- aria 音動機: 状態異常敵への与ダメ +20〜32%、混沌ダメ +10〜16%(現エントリは異常ダメのみ)
- nangong_yu M4 通常攻撃の蓄積値 +35%、qingyi M2 征服上限時のブレイク値 +15%、hugo コア 非ブレイク時ブレイク値 +20%、cissia M1 骨蝕みの電気耐性無視 10%
- piper M1 動力上限 30 重(構造上は別エントリで表現)、pulchra M6 囚縛の適用拡大、astra M4 次のクイック支援の蓄積/ブレイク値 +50%
- vivian 追加能力の「侵蝕」ダメージ +12%(混沌側のみ収録)

## 検証

- `npm run validate-data` OK(60 体 / 533 バフ)、`npm test` 114 件 pass、build / lint OK、e2e(下記実行ログ)
- 2026-10-19 修正適用後: validate-data OK(533 バフ)、npm test 114 件 pass、build / lint OK、e2e 87 件 PASS。未コミット(ブランチ feat/damage-impact-calc)

## ユーザー回答の反映(2026-10-19)

- 受け手の表現: `target` に active / bench を追加。Q1 アストラ・Q4 蒼角・Q7 ノルムーは self + next_swap_in、Q6 ライト M4 は active、Q9 アンビー M4 は bench(電気)、Q10 シードの包囲バフは self。Q2/Q3/Q5/Q8/Q11 はそのまま
- Q12〜23: 現状維持(敵に紐づく全員バフは team)。Q24 ビビアン M2 → 狂咲限定(modes)、Q25/Q27/Q29 は敵デバフのまま、Q26 レミエール M1 → self、Q28 ジェーン M2 → 強撃限定(modes anomaly、物理)
- 4: energy_gain_eff_pct / energy_regen_pct / decibel_gain_eff_pct を新設して移動。ダイアリン M1 高評価は固有リソースのため削除
- 5: disorder_multiplier_pct(混沌倍率加算、計算は (450+X)/450)を新設しアリス / 柚葉 / 月城柳を移動
- 6: スキル限定の与ダメを self で 13 キャラ分追加(攻撃種別セレクタで有効)
- 7: anomaly_crit_rate / anomaly_crit_dmg を新設。ジェーン(強撃 = 物理・anomaly 限定)、アリア(狂咲 = abloom 限定)。状態異常モードでは常時適用、異常会心トグル ON で通常会心と合算
- 8: A 級音動機 11 体分を収録、characters.json の音動機名を設定
- 追加: アストラ音動機の EN 回復、ライト M4 控え EN +5、アリア音動機の与ダメ/混沌ダメ
- 保留(ユーザー指定): 南宮羽 M4、青衣 M2、ヒューゴ コア非ブレイク時ブレイク値、シーシィア M1 骨蝕み、パイパー M1 動力上限、プルクラ M6 囚縛拡大、アストラ M4、ビビアン 侵蝕 +12%
- 未回答のため据え置き: イドリー コアの pen_ratio 100、バーニス コアのエンバー与ダメ(dmg_pct のまま)、真斗 M1、プロメイア コアの係数収録、クレタ/ロクシーの[鋭御]除外条件、レミエール/リュシアのスキル Lv 依存値、ポテンシャル段階(バーニス/ライカン/リナ)
- 検証: validate-data OK(582 バフ)、npm test 118 件 pass、tsc / lint / build OK、e2e(下記)
- 2026-10-19 反映後の検証: validate-data OK(582 バフ)、npm test 118 件 pass、tsc / lint / build OK、e2e 87 件 PASS。未コミット
