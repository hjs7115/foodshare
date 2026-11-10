"""Curate existing exhibition group templates only. Run on EC2; --apply opts in.
Does not touch ordinary posts or private demo sessions. Backups stay on the server.
"""
import argparse, json, subprocess
from pathlib import Path
from datetime import datetime, timezone

KEEP = {
 30: dict(title='오트밀 2kg, 반씩 나눠 주문하실 분', quantity='1인 1kg', price=7000, current=1, target=2,
 content='아침에 먹으려고 오트밀 2kg 주문하려는데 혼자 먹기엔 많아서 같이 나눠요.\n두 명이 1kg씩 가져가면 1인 7,000원이에요. 소분할 깨끗한 밀폐용기 챙겨주세요.\n수령 가능한 시간은 채팅으로 맞춰봐요.'),
 31: dict(title='파스타면 6봉 묶음, 두 봉씩 나눠요', quantity='1인 500g 2봉', price=4200, current=2, target=3,
 content='500g 파스타면 6봉을 세 명이 두 봉씩 나누려고 해요.\n총 12,600원이라 1인 부담은 4,200원입니다. 봉지를 뜯지 않고 그대로 드릴게요.\n같이 주문하실 분은 참여해주세요! 수령 시간은 채팅에서 정해요.'),
 34: dict(title='냉동 만두 4봉, 두 봉씩 같이 사실 분', quantity='1인 2봉', price=13000, current=1, target=2,
 content='만두 4봉 묶음으로 주문하면 총 26,000원이라 같이 사실 한 분 구해요.\n두 봉씩 가져가고 1인 13,000원입니다. 냉동 제품이라 도착하는 날 시간을 맞춰 받으면 좋겠어요.\n가져가실 때 보냉가방 챙겨주세요.'),
 35: dict(title='토마토소스 같이 주문해요, 한 병씩!', quantity='1인 1병', price=3400, current=2, target=3,
 content='파스타 만들 때 쓰려고 토마토소스 세 병 같이 주문하려고요.\n세 명이 한 병씩 가져가면 1인 3,400원, 총 10,200원이에요. 개봉하지 않은 병 그대로 나눠요.\n관심 있으시면 참여해주세요. 주문과 수령 일정은 같이 맞춰봐요.'),
 37: dict(title='드립백 커피 30개, 열 개씩 나눠 구매해요', quantity='1인 10개', price=5500, current=2, target=3,
 content='회사에 가져가서 마시려고 드립백 커피 묶음 주문해요.\n30개를 세 명이 10개씩 나누고, 1인 5,500원입니다. 총금액은 16,500원이에요.\n낱개 포장이라 나누기도 편해요. 편한 수령 시간 알려주세요.'),
}
HIDE = [29,32,33,36,38]
IDS = sorted([*KEEP,*HIDE])
ID_SQL = ','.join(map(str,IDS))

def sql(query):
 p=subprocess.run(['docker','exec','-i','foodshare-mysql','sh','-c',
  'MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 -N -B -u"$MYSQL_USER" "$MYSQL_DATABASE"'],
  input=query,text=True,capture_output=True)
 if p.returncode: raise RuntimeError(p.stderr)
 return p.stdout.strip()

def literal(value):
 return str(value) if isinstance(value,int) else 'CONVERT(0x'+value.encode().hex()+' USING utf8mb4)'

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 guard="p.id IN ("+ID_SQL+") AND p.post_type='GROUP_BUY' AND u.email LIKE 'graduation-20261111-%@demo.invalid'"
 assert sql('SELECT COUNT(*) FROM posts p JOIN demo_posts d ON d.post_id=p.id JOIN users u ON u.id=p.user_id WHERE '+guard)=='10'
 # Refuse to rewrite a real member request or an ongoing original-template chat.
 assert sql("SELECT COUNT(*) FROM trade_requests t JOIN users u ON u.id=t.requester_id WHERE t.post_id IN ("+ID_SQL+") AND u.email NOT LIKE 'graduation-20261111-%@demo.invalid'")=='0'
 assert sql("SELECT COUNT(*) FROM chat_rooms c JOIN trade_requests t ON t.id=c.trade_request_id WHERE t.post_id IN ("+ID_SQL+")")=='0'
 columns=[line.split('\t')[0] for line in sql('SHOW COLUMNS FROM posts').splitlines()]
 rows=sql('SELECT JSON_OBJECT('+','.join(literal(c)+',CAST(p.`'+c+'` AS CHAR)' for c in columns)+') FROM posts p WHERE p.id IN ('+ID_SQL+')')
 trades=sql('SELECT id,post_id,requester_id,status FROM trade_requests WHERE post_id IN ('+ID_SQL+')')
 print('Demo templates verified; keep:',list(KEEP),'hide:',HIDE)
 if not args.apply:return
 backup=Path('/home/ubuntu/foodshare-backups')/('small-demo-groups-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
 backup.mkdir(parents=True,mode=0o700)
 (backup/'posts.json').write_text('[\n'+',\n'.join(rows.splitlines())+'\n]')
 (backup/'trades.tsv').write_text(trades+'\n')
 for f in backup.iterdir():f.chmod(0o600)
 statements=['START TRANSACTION;', 'SELECT id FROM posts WHERE id IN ('+ID_SQL+') FOR UPDATE;']
 for post_id,data in KEEP.items():
  fields={'title':data['title'],'content':data['content'],'quantity':data['quantity'],'price':data['price'],
   'current_participant_count':data['current'],'target_participant_count':data['target']}
  statements.append('UPDATE posts SET '+','.join(k+'='+literal(v) for k,v in fields.items())+' WHERE id='+str(post_id)+';')
 # Remove the seeded oat participant from active counts; preserve the record/history.
 statements.append("UPDATE trade_requests SET status='CANCELLED' WHERE post_id=30 AND status='ACCEPTED';")
 statements.append('UPDATE posts SET deleted=1 WHERE id IN ('+','.join(map(str,HIDE))+');')
 statements.append('COMMIT;');sql('\n'.join(statements))
 assert sql("SELECT COUNT(*) FROM posts p JOIN demo_posts d ON d.post_id=p.id WHERE p.post_type='GROUP_BUY' AND p.deleted=0")=='5'
 assert sql('SELECT COUNT(*) FROM posts WHERE id IN ('+','.join(map(str,KEEP))+') AND current_participant_count IN (1,2) AND target_participant_count IN (2,3) AND current_participant_count<target_participant_count')=='5'
 assert sql('SELECT COUNT(*) FROM posts p WHERE p.id IN ('+','.join(map(str,KEEP))+') AND p.current_participant_count <> 1+(SELECT COUNT(*) FROM trade_requests t WHERE t.post_id=p.id AND t.status IN (\'ACCEPTED\',\'COMPLETED\'))')=='0'
 print('Applied and verified 5 templates; backup:',backup)

if __name__=='__main__':main()

