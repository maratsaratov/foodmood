"""
Скрипт для первоначальной инициализации БД и тестовых данных.
Запускается внутри backend-контейнера:
  docker compose exec backend python seed.py
"""
from app import create_app, db
from app.models import User, MealLog, MoodLog, Place, Notification
from datetime import datetime, timedelta
import random

app = create_app()

with app.app_context():
    db.create_all()

    # Создаём тестового администратора
    if not User.query.filter_by(email='admin@edanastroenie.ru').first():
        admin = User(email='admin@edanastroenie.ru', username='admin', is_admin=True)
        admin.set_password('admin123')
        db.session.add(admin)

    # Тестовый пользователь
    if not User.query.filter_by(email='user@example.com').first():
        user = User(email='user@example.com', username='testuser', bio='Слежу за питанием и настроением')
        user.set_password('test123')
        db.session.add(user)
        db.session.flush()

        # 14 дней записей питания и настроения
        foods = [
            ('Овсянка с ягодами', 320, 'завтрак', 10, 3, 55),
            ('Куриная грудка с рисом', 480, 'обед', 40, 8, 45),
            ('Салат Цезарь', 380, 'обед', 22, 18, 20),
            ('Гречка с тушёными овощами', 350, 'ужин', 15, 6, 55),
            ('Яблоко', 80, 'перекус', 0, 0, 20),
            ('Творог с мёдом', 220, 'завтрак', 18, 5, 22),
            ('Борщ', 280, 'обед', 12, 10, 30),
            ('Лосось с брокколи', 520, 'ужин', 38, 22, 10),
            ('Банан', 90, 'перекус', 1, 0, 22),
            ('Пицца', 720, 'обед', 30, 28, 70),
            ('Омлет с овощами', 290, 'завтрак', 20, 18, 8),
            ('Суп-пюре тыквенный', 220, 'обед', 5, 8, 28),
        ]

        for i in range(14):
            day = datetime.utcnow() - timedelta(days=13 - i)
            # 2–3 приёма пищи в день
            for food in random.sample(foods, k=random.randint(2, 3)):
                ml = MealLog(
                    user_id=user.id,
                    food_name=food[0], calories=food[1],
                    meal_type=food[2], proteins=food[3],
                    fats=food[4], carbs=food[5],
                    meal_time=day.replace(hour=random.choice([8, 13, 19])),
                    is_public=random.choice([True, False]),
                )
                db.session.add(ml)

            # Настроение каждый день
            mood = MoodLog(
                user_id=user.id,
                mood_score=random.randint(4, 9),
                description=random.choice(['Хороший день', 'Немного устал', 'Отличное самочувствие', '']),
                logged_at=day.replace(hour=20),
            )
            db.session.add(mood)

        # Тестовое заведение
        place = Place(
            name='Кафе «Здоровая еда»',
            address='ул. Ленина, 42',
            description='Уютное кафе со здоровым меню',
            is_verified=True,
            added_by=user.id,
        )
        db.session.add(place)

        # Тестовое уведомление
        notif = Notification(
            user_id=user.id,
            type='recommendation',
            message='💡 Вы заносите данные 7 дней подряд! Загляните в аналитику.',
        )
        db.session.add(notif)

    db.session.commit()
    print('✅ База данных инициализирована. Тестовые данные созданы.')
    print('   admin@edanastroenie.ru / admin123')
    print('   user@example.com / test123')
