#!/bin/sh
set -e

MONGO_HOST="${MONGO_HOST:-mongo}"

STATUS=$(mongosh --host "$MONGO_HOST" --quiet --eval "try { rs.status().ok } catch(e) { 0 }" 2>/dev/null || echo "0")
if [ "$STATUS" = "1" ]; then
  echo "Replica set already initialized"
  exit 0
fi

echo "Initiating replica set..."
mongosh --host "$MONGO_HOST" --quiet --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: '${MONGO_HOST}:27017'}]})"
echo "Replica set initiated"

sleep 3
STATE=$(mongosh --host "$MONGO_HOST" --quiet --eval "rs.status().members[0].stateStr")
echo "Replica set state: $STATE"
