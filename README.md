# АИС «ЕдаНастроение»

Автоматизированная информационная система для ведения дневника питания и эмоционального состояния с социальными функциями и аналитикой.

**Стек:** React 18 · Flask · PostgreSQL · Docker Compose

---

## Быстрый старт

```bash
# 1. Клонируйте репозиторий
git clone <url> && cd edanastroenie

# 2. Создайте .env из примера
cp .env.example .env
# Отредактируйте .env — обязательно задайте SECRET_KEY и JWT_SECRET_KEY

# 3. Запустите
docker compose up --build

# 4. (Опционально) Загрузите тестовые данные
docker compose exec backend python seed.py
```

Откройте **http://localhost** в браузере.

Тестовые аккаунты (после seed.py):
| Email | Пароль | Роль |
|---|---|---|
| `admin@edanastroenie.ru` | `admin123` | Администратор |
| `user@example.com` | `test123` | Пользователь |

---

## Структура проекта

```
edanastroenie/
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── backend/                  # Flask API
│   ├── Dockerfile
│   ├── entrypoint.sh         # Ждёт БД, запускает миграции, gunicorn
│   ├── requirements.txt
│   ├── manage.py             # Flask CLI (flask db ...)
│   ├── run.py                # Точка входа gunicorn
│   ├── seed.py               # Тестовые данные
│   ├── app/
│   │   ├── __init__.py       # Фабрика приложения
│   │   ├── models.py         # SQLAlchemy модели
│   │   └── routes/
│   │       ├── auth.py       # Регистрация, логин, профиль
│   │       ├── meals.py      # Дневник питания
│   │       ├── moods.py      # Дневник настроения
│   │       ├── analytics.py  # Корреляция Пирсона, графики
│   │       ├── social.py     # Лайки, комментарии
│   │       ├── reviews.py    # Отзывы
│   │       ├── places.py     # Заведения
│   │       ├── notifications.py
│   │       └── search.py
│   └── tests/
│       └── test_api.py       # pytest
│
└── frontend/                 # React SPA
    ├── Dockerfile
    ├── nginx.conf            # Прокси /api/ → backend, SPA fallback
    ├── package.json
    └── src/
        ├── App.js            # Роутер
        ├── index.css         # Дизайн-система
        ├── api/client.js     # Axios + JWT interceptor
        ├── hooks/
        │   ├── useAuth.js    # AuthContext
        │   └── useNotifications.js
        ├── components/
        │   └── Sidebar.js
        ├── pages/
        │   ├── DashboardPage.js
        │   ├── MealsPage.js
        │   ├── MoodsPage.js
        │   ├── AnalyticsPage.js   # Recharts: scatter, line, bar
        │   ├── FeedPage.js
        │   ├── PlacesPage.js
        │   ├── NotificationsPage.js
        │   ├── SearchPage.js
        │   ├── ProfilePage.js
        │   └── AuthPages.js  # Login + Register
        └── utils/helpers.js
```

---

## API (OpenAPI 3.0 — REST)

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Логин → JWT |
| GET/PUT | `/api/auth/me` | Профиль |
| GET/POST | `/api/meals/` | Дневник питания |
| GET | `/api/meals/feed` | Публичная лента |
| GET/POST | `/api/moods/` | Дневник настроения |
| GET | `/api/analytics/summary` | Сводная статистика |
| GET | `/api/analytics/correlation` | Корреляция Пирсона |
| POST | `/api/social/like` | Лайк/анлайк |
| POST | `/api/social/comments` | Добавить комментарий |
| GET/POST | `/api/places/` | Заведения |
| POST | `/api/places/<id>/verify` | Верификация (admin) |
| GET/POST | `/api/reviews/` | Отзывы |
| GET | `/api/notifications/` | Уведомления |
| GET | `/api/search/` | Поиск |

Все эндпоинты (кроме `/auth/register`, `/auth/login`, `/health`) требуют заголовок:
```
Authorization: Bearer <jwt_token>
```

---

## Разработка без Docker

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # настройте DATABASE_URL
flask db init && flask db migrate -m "init" && flask db upgrade
python run.py
```

**Frontend:**
```bash
cd frontend
npm install
# В package.json proxy уже настроен на http://localhost:5000
npm start
```

---

## Тесты

```bash
cd backend
pip install pytest
pytest tests/ -v
```

---

## Требования ТЗ → реализация

| Требование | Реализация |
|---|---|
| Фиксация приёмов пищи и эмоций | `MealLog`, `MoodLog`, шкала 1–10 |
| Сбор отзывов и оценок | `Review` с антиспамом и проверкой дублей |
| Добавление заведений | `Place` с верификацией admin |
| Корреляция (Pearson) | `analytics.py` → scipy.stats.pearsonr |
| Рекомендации | Генерируются по коэффициенту корреляции |
| Социальное взаимодействие | Лайки, комментарии, уведомления |
| Фильтрация данных | По типу, дате, настроению |
| Уведомления | In-app, polling 30s, toggle вкл/выкл |
| Регистрация и аутентификация | JWT, bcrypt, смена пароля |
| Поиск | По заведениям и продуктам с автодополнением |
| Графики | Recharts: scatter, line, bar |
| PostgreSQL | SQLAlchemy + Flask-Migrate |
| REST + JSON | OpenAPI-совместимый API |
| Покрытие тестами | pytest, ключевые маршруты |
