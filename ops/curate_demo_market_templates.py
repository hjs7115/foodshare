"""Curate only the original registered market demo templates. Default is dry-run."""
import argparse
from datetime import datetime, timezone
from pathlib import Path
from curate_demo_group_templates import sql, literal

KEEP = {
17: ('SHARE','당근 네 개 남았는데 가져가실 분?',
     '라페 만들고 당근이 네 개 남았어요. 혼자 먹기엔 좀 많네요ㅎㅎ\n필요하신 분께 전부 드릴게요. 가져가실 시간만 채팅으로 알려주세요.'),
20: ('SALE','사과 4개 2,500원에 가져가세요',
     '사과 네 개 한꺼번에 2,500원입니다.\n크기가 조금씩 달라요. 사진 보시고 필요하시면 연락 주세요.'),
23: ('SALE','계란 10알만 필요하신 분 계세요?',
     '한 판 샀는데 다 먹기엔 많아서 열 알만 내놓아요. 2,500원이에요!\n사진에 있는 종이 케이스에 담아서 드릴게요. 편한 시간 말씀해주세요.'),
24: ('SHARE','두부 두 팩, 드실 분께 드려요',
     '찌개 하려고 넉넉히 샀다가 두 팩이 남았어요. 둘 다 뜯지 않은 거예요.\n한 번에 가져가실 분이면 좋겠어요. 필요하시면 채팅 주세요.'),
25: ('SHARE','대파 조금 필요하시면 가져가세요',
     '한 단 사면 꼭 남네요.. 세 대 정도 나눌 수 있어요.\n아직 손질 안 했고 봉투에 담아뒀어요. 국 끓이거나 볶음밥 할 때 쓰시면 될 것 같아요.'),
26: ('BUY','카레 하려는데 당근만 없네요',
     '당근 한두 개만 사고 싶어요. 한 봉지 사기엔 너무 많아서요.\n천 원 정도 생각하고 있는데 크기랑 수량 보고 맞춰도 괜찮아요. 근처면 제가 가지러 갈게요.'),
}
HIDE={18:'SALE',19:'SALE',21:'SHARE',22:'SHARE',27:'BUY',28:'BUY'}
IDS=sorted([*KEEP,*HIDE]);ID_SQL=','.join(map(str,IDS))

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 for id in IDS:
  kind=KEEP[id][0] if id in KEEP else HIDE[id]
  assert sql("SELECT COUNT(*) FROM posts p JOIN demo_posts d ON d.post_id=p.id JOIN users u ON u.id=p.user_id WHERE p.id="+str(id)+" AND p.post_type="+("'"+kind+"'")+" AND u.email LIKE 'graduation-20261111-%@demo.invalid'")=='1'
 assert sql("SELECT COUNT(*) FROM trade_requests WHERE post_id IN ("+ID_SQL+") AND status IN ('PENDING','ACCEPTED','COMPLETED')")=='0','Original templates have live/completed requests; inspect before editing'
 print('Keep',list(KEEP),'hide',list(HIDE))
 if not args.apply:return
 columns=[line.split('\t')[0] for line in sql('SHOW COLUMNS FROM posts').splitlines()]
 rows=sql('SELECT JSON_OBJECT('+','.join(literal(c)+',CAST(p.`'+c+'` AS CHAR)' for c in columns)+') FROM posts p WHERE p.id IN ('+ID_SQL+')')
 backup=Path('/home/ubuntu/foodshare-backups')/('market-copy-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
 backup.mkdir(parents=True,mode=0o700)
 file=backup/'posts.json';file.write_text('[\n'+',\n'.join(rows.splitlines())+'\n]');file.chmod(0o600)
 statements=['START TRANSACTION;','SELECT id FROM posts WHERE id IN ('+ID_SQL+') FOR UPDATE;']
 for id,(_,title,content) in KEEP.items():
  statements.append('UPDATE posts SET title='+literal(title)+',content='+literal(content)+' WHERE id='+str(id)+';')
 statements.append('UPDATE posts SET deleted=1 WHERE id IN ('+','.join(map(str,HIDE))+');')
 statements.append('COMMIT;');sql('\n'.join(statements))
 counts=sql("SELECT post_type,COUNT(*) FROM posts p JOIN demo_posts d ON d.post_id=p.id WHERE p.post_type<>'GROUP_BUY' AND p.deleted=0 GROUP BY post_type ORDER BY post_type")
 assert dict(line.split('\t') for line in counts.splitlines())=={'SHARE':'3','SALE':'2','BUY':'1'},counts
 print('Verified: SHARE 3, SALE 2, BUY 1. Backup:',backup)

if __name__=='__main__':main()

