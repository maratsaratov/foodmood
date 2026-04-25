"""
Тестовые данные. Запуск:
  docker compose exec backend python seed.py
"""
from app import create_app, db
from app.models import User, MealLog, Place, Notification
from datetime import datetime, timedelta
import random

app = create_app()

FOODS = [
    ('Овсянка с ягодами',      320, 'завтрак', 10, 3,  55),
    ('Куриная грудка с рисом', 480, 'обед',    40, 8,  45),
    ('Салат Цезарь',           380, 'обед',    22, 18, 20),
    ('Гречка с овощами',       350, 'ужин',    15, 6,  55),
    ('Яблоко',                  80, 'перекус',  0, 0,  20),
    ('Творог с мёдом',         220, 'завтрак', 18, 5,  22),
    ('Борщ',                   280, 'обед',    12, 10, 30),
    ('Лосось с брокколи',      520, 'ужин',    38, 22, 10),
    ('Банан',                   90, 'перекус',  1, 0,  22),
    ('Пицца',                  720, 'обед',    30, 28, 70),
    ('Омлет с овощами',        290, 'завтрак', 20, 18,  8),
    ('Суп-пюре тыквенный',     220, 'обед',     5, 8,  28),
]

with app.app_context():
    db.create_all()

    if not User.query.filter_by(email='admin@edanastroenie.ru').first():
        admin = User(email='admin@edanastroenie.ru', username='admin', is_admin=True)
        admin.set_password('admin123')
        db.session.add(admin)

    if not User.query.filter_by(email='user@example.com').first():
        user = User(email='user@example.com', username='testuser', bio='Слежу за питанием и настроением')
        user.set_password('test123')
        db.session.add(user)
        db.session.flush()

        for i in range(21):
            day = datetime.utcnow() - timedelta(days=20 - i)
            for food in random.sample(FOODS, k=random.randint(2, 4)):
                # Настроение привязано к конкретному приёму пищи (необязательно)
                mood = random.choice([None, None, random.randint(4, 9)])
                ml = MealLog(
                    user_id=user.id,
                    food_name=food[0], calories=food[1],
                    meal_type=food[2], proteins=food[3],
                    fats=food[4], carbs=food[5],
                    mood_score=mood,
                    meal_time=day.replace(hour=random.choice([8, 13, 19])),
                    is_public=random.choice([True, False]),
                )
                db.session.add(ml)

        place = Place(
            name='Кафе «Здоровая еда»',
            address='ул. Ленина, 42',
            description='Уютное кафе со здоровым меню',
            is_verified=True,
            added_by=user.id,
        )
        db.session.add(place)

        db.session.add(Notification(
            user_id=user.id,
            type='recommendation',
            message='💡 Попробуйте указывать настроение к каждому приёму пищи — это поможет найти связь с питанием.',
        ))

    db.session.commit()
    print('✅ Готово.')
    print('   admin@edanastroenie.ru / admin123')
    print('   user@example.com       / test123')
