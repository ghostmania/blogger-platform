#!/usr/bin/env bash
# Прогон всего auth-флоу по живому приложению.
# Использование:  BASE=http://localhost:5005 bash scripts/smoke-auth.sh
set -u
BASE="${BASE:-http://localhost:5005}"
PASS=0; FAIL=0

chk() { # chk <описание> <ожидаемый код> <фактический код>
  if [ "$2" = "$3" ]; then printf '  \033[32mOK\033[0m   %-52s %s\n' "$1" "$3"; PASS=$((PASS+1));
  else printf '  \033[31mFAIL\033[0m %-52s ожидали %s, получили %s\n' "$1" "$2" "$3"; FAIL=$((FAIL+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "БАЗА: $BASE"
echo "--- подготовка ---"
chk "DELETE /testing/all-data" 204 "$(code -X DELETE $BASE/testing/all-data)"

echo "--- регистрация ---"
chk "POST /auth/registration" 204 "$(code -X POST $BASE/auth/registration -H 'Content-Type: application/json' \
  -d '{"login":"smoke","password":"password123","email":"smoke@example.com"}')"
chk "дубликат логина -> 400" 400 "$(code -X POST $BASE/auth/registration -H 'Content-Type: application/json' \
  -d '{"login":"smoke","password":"password123","email":"other@example.com"}')"
chk "мусорный код подтверждения -> 400 (не 500)" 400 "$(code -X POST $BASE/auth/registration-confirmation \
  -H 'Content-Type: application/json' -d '{"code":"not-a-uuid"}')"

echo "--- где лежит юзер ---"
LIST=$(curl -s -u admin:qwerty "$BASE/users")
ID=$(printf '%s' "$LIST" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).items[0].id)}catch(e){console.log('?')}})")
if printf '%s' "$ID" | grep -qE '^[0-9]+$'; then
  echo "  id = $ID  -> PostgreSQL (bigserial)"
elif printf '%s' "$ID" | grep -qE '^[0-9a-f]{24}$'; then
  echo "  id = $ID  -> MongoDB (ObjectId)"
else
  echo "  не удалось прочитать id: '$ID'"
fi

echo "--- логин и сессии ---"
R=$(curl -s -i -X POST $BASE/auth/login -H 'Content-Type: application/json' -H 'User-Agent: smoke-device' \
  -d '{"loginOrEmail":"smoke","password":"password123"}')
chk "POST /auth/login" 200 "$(printf '%s' "$R" | head -1 | grep -o '[0-9]\{3\}')"
AT=$(printf '%s' "$R" | tail -1 | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).accessToken)}catch(e){console.log('')}})")
RT=$(printf '%s' "$R" | grep -i '^set-cookie' | sed 's/.*refreshToken=\([^;]*\).*/\1/' | tr -d '\r')
[ -n "$RT" ] && echo "  refreshToken пришёл в httpOnly cookie" || echo "  cookie не найдена!"

chk "GET /auth/me" 200 "$(code $BASE/auth/me -H "Authorization: Bearer $AT")"
chk "GET /auth/me без токена -> 401" 401 "$(code $BASE/auth/me)"
chk "GET /security/devices" 200 "$(code -H "Cookie: refreshToken=$RT" $BASE/security/devices)"

echo "--- ротация refresh-токена ---"
R2=$(curl -s -i -X POST $BASE/auth/refresh-token -H "Cookie: refreshToken=$RT")
chk "POST /auth/refresh-token" 200 "$(printf '%s' "$R2" | head -1 | grep -o '[0-9]\{3\}')"
RT2=$(printf '%s' "$R2" | grep -i '^set-cookie' | sed 's/.*refreshToken=\([^;]*\).*/\1/' | tr -d '\r')
chk "старый refresh отозван -> 401" 401 "$(code -X POST $BASE/auth/refresh-token -H "Cookie: refreshToken=$RT")"

echo "--- выход ---"
chk "POST /auth/logout" 204 "$(code -X POST $BASE/auth/logout -H "Cookie: refreshToken=$RT2")"
chk "повторный logout -> 401" 401 "$(code -X POST $BASE/auth/logout -H "Cookie: refreshToken=$RT2")"

echo "--- валидация id ---"
chk "DELETE /users/мусор -> 400" 400 "$(code -u admin:qwerty -X DELETE $BASE/users/not-an-id)"
chk "DELETE /users/999999 -> 404" 404 "$(code -u admin:qwerty -X DELETE $BASE/users/999999)"

echo
echo "ИТОГ: $PASS ok, $FAIL fail"
[ "$FAIL" -eq 0 ]
