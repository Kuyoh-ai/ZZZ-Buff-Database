# 収集データの正規化(一回限りの整備スクリプト。再実行しても安全)
import json, glob, io, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf8')
ROLE_COMP_IDS = {"dialyn_additional_ex_crit_dmg","lighter_elation_dmg_fire","lighter_elation_dmg_ice","lucia_additional_critdmg","pyrois_addon_crit_dmg","sigrid_addon_atk_flat","yanagi_moonphase_buildup","yidhari_add_ability_crit_dmg","zhao_extra_team_dmg"}
changed=0
for f in sorted(glob.glob('src/data/buffs/*.json')):
    d=json.load(open(f,encoding='utf8'))
    out=[]; log=[]
    seen_all=None
    for b in d['buffs']:
        # 1. element "all" -> enemy_res_ignore_all_pct
        if b.get('element')=='all':
            b['stat']='enemy_res_ignore_all_pct'; b.pop('element'); log.append(f"{b['id']}: element all -> enemy_res_ignore_all_pct")
        # 2. 編成条件を condition から外す
        c=b.get('condition')
        if c:
            if 'note' in c:
                b['note']=(b.get('note','')+' '+c.pop('note')).strip(); log.append(f"{b['id']}: moved condition.note -> note")
            if c.get('excludeSelf') is False: c.pop('excludeSelf')
            if b['id'] in ROLE_COMP_IDS:
                extra=c.pop('note',None)
                c.pop('roles',None); c.pop('factions',None)
                if extra: b['note']=(b.get('note','')+' '+extra).strip()
                log.append(f"{b['id']}: removed team-composition condition")
            if not c: b.pop('condition')
        # 3. 音動機の欠損段階
        w=b.get('wengine')
        if w and any(k not in w or w[k] is None for k in ('p1','p2','p3','p4','p5')):
            if w.get('p1') is not None and w.get('p5') is not None:
                p1,p5=w['p1'],w['p5']
                for i,k in enumerate(('p2','p3','p4'),1):
                    if w.get(k) is None: w[k]=round(p1+(p5-p1)*i/4,2)
                b['note']=(b.get('note','')+' 音動機P2〜P4は P1/P5 からの等差補間(未確認)').strip()
                log.append(f"{b['id']}: interpolated wengine p2-p4")
            else:
                known={k:v for k,v in w.items() if v is not None}
                b.pop('wengine')
                b['note']=(b.get('note','')+f" 音動機効果(確認できた段階のみ): {known}").strip()
                log.append(f"{b['id']}: dropped partial wengine {known}")
        # 4. 自身の与ダメージ限定の敵デバフは target self
        if b['id']=='soldier_0_anby_m4_electric_res_down' and b['target']!='self':
            b['target']='self'; b.pop('condition',None); log.append(f"{b['id']}: target -> self")
        # 5. norma M1 全属性6分割 -> 1件に統合
        if b['id'].startswith('norma_m1_enemy_res_down'):
            if seen_all: continue
            seen_all=b; b['id']='norma_m1_res_down_all'; b['stat']='enemy_res_ignore_all_pct'; b.pop('element',None)
            b['name']='M1: 全属性耐性ダウン'; log.append('norma: merged 6 elemental res-down entries')
        out.append(b)
    if log:
        d['buffs']=out
        json.dump(d,open(f,'w',encoding='utf8'),ensure_ascii=False,indent=2); open(f,'a',encoding='utf8').write('\n')
        changed+=1
        print(os.path.basename(f)); [print('  ',l) for l in log]
print('files changed:',changed)
