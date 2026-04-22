#!/bin/sh
set -e

echo "⏳ Ожидание PostgreSQL..."
until python -c "import psycopg2; psycopg2.connect('${DATABASE_URL}')" 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL доступен"

echo "🔄 Применение миграций..."
flask db upgrade 2>/dev/null || (flask db init && flask db migrate -m "initial" && flask db upgrade)

echo "🚀 Запуск сервера..."
exec gunicorn -w 2 -b 0.0.0.0:5000 --timeout 120 "run:app"
