#!/bin/sh
# Web entrypoint: migrate, seed (idempotent), serve, then purge build-time ISR pages once the server is up.
set -e
node migrate.mjs
node seed.mjs
node server.js &
PID=$!
for i in $(seq 1 60); do
  if node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/internal/revalidate',{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "ISR cache purged"; break
  fi
  sleep 1
done
wait $PID
