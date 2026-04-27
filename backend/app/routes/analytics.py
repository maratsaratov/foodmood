import ssl
import os
import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import MealLog
from datetime import datetime, timedelta
from scipy.stats import pearsonr
from gigachat import GigaChat

logger = logging.getLogger(__name__)
analytics_bp = Blueprint('analytics', __name__)
MIN_RECORDS_FOR_ANALYSIS = 7
FALLBACK_RECOMMENDATIONS = [
    'Старайтесь есть регулярно — 3-5 раз в день',
    'Включайте в рацион больше овощей и фруктов',
    'Ограничьте потребление сахара и фастфуда',
    'Пейте достаточно воды — около 2 литров в день',
    'Не пропускайте завтрак — это важно для настроения',
]


def _get_giga():
    """Создаём клиент GigaChat с отключённой проверкой SSL (как в примере)."""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    return GigaChat(
        credentials=os.getenv('GIGACHAT_CREDENTIALS',
            'your-gigachat-credentials-here'),
        verify_ssl_certs=False,
        ssl_context=ssl_context,
        model='GigaChat-Max',
    )


def _ask_giga(prompt: str) -> str | None:
    """Отправляет запрос в GigaChat, возвращает текст или None при ошибке."""
    try:
        giga = _get_giga()
        response = giga.chat(prompt)
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f'GigaChat недоступен: {e}')
        return None


def _giga_interpretation(corr: float, p_value: float, avg_cal: float,
                          avg_mood: float, data_points: int) -> str:
    """GigaChat формулирует интерпретацию корреляции."""
    prompt = f"""Ты диетолог-аналитик. Пользователь ведёт дневник питания и настроения.
Данные за период:
- Коэффициент корреляции Пирсона между суточными калориями и настроением: {corr}
- p-value: {p_value} ({'статистически значимо' if p_value < 0.05 else 'недостаточно значимо'})
- Средние калории в день: {round(avg_cal)} ккал
- Среднее настроение: {round(avg_mood, 1)} из 10
- Количество точек данных (дней): {data_points}

Напиши одно ёмкое предложение (до 20 слов) — интерпретацию этой корреляции для пользователя.
Только само предложение, без вводных слов и пояснений."""
    result = _ask_giga(prompt)
    if result:
        # Берём только первое предложение на случай если модель написала больше
        return result.split('\n')[0].split('. ')[0].strip('.')  + '.'
    # Fallback на хардкод
    if corr > 0.5:
        return 'Сильная положительная связь: в дни с большим количеством калорий настроение лучше.'
    elif corr > 0.2:
        return 'Умеренная положительная связь между питанием и настроением.'
    elif corr < -0.5:
        return 'Сильная отрицательная связь: переедание ухудшает настроение.'
    elif corr < -0.2:
        return 'Умеренная отрицательная связь: стоит следить за количеством еды.'
    return 'Явной связи между калориями и настроением не выявлено.'


def _giga_recommendations(corr: float, avg_cal: float, avg_mood: float,
                           meal_type_counts: dict, top_foods: list) -> list[str]:
    """GigaChat генерирует персональные рекомендации."""
    meal_types_str = ', '.join(f'{k}: {v}' for k, v in meal_type_counts.items()) or 'нет данных'
    foods_str = ', '.join(top_foods[:5]) if top_foods else 'нет данных'

    prompt = f"""Ты диетолог. Составь 3 персональные рекомендации по питанию для пользователя.

Данные пользователя:
- Корреляция калории↔настроение: {corr} (от -1 до 1)
- Средние калории в день: {round(avg_cal)} ккал
- Среднее настроение: {round(avg_mood, 1)}/10
- Распределение приёмов пищи: {meal_types_str}
- Часто употребляемые продукты: {foods_str}

Требования к ответу:
- Ровно 3 рекомендации
- Каждая с новой строки, начинается с "- "
- Конкретные, основанные на данных выше
- На русском языке
- Без вводных фраз типа "Конечно!" или "Вот рекомендации:"
- Каждая рекомендация — одно предложение до 25 слов"""

    result = _ask_giga(prompt)
    if result:
        lines = [l.lstrip('- •').strip() for l in result.split('\n') if l.strip()]
        recs = [l for l in lines if len(l) > 10][:3]
        if recs:
            return recs

    # Fallback
    recs = []
    if avg_cal > 2500:
        recs.append('Вы потребляете много калорий — попробуйте уменьшить порции.')
    elif avg_cal < 1200:
        recs.append('Вы потребляете мало калорий — убедитесь, что питаетесь достаточно.')
    if avg_mood < 5:
        recs.append('Среднее настроение ниже нормы — обратите внимание на режим питания и отдыха.')
    if corr < -0.3:
        recs.append('В дни с большим количеством еды настроение хуже — попробуйте есть меньше, но чаще.')
    elif corr > 0.3:
        recs.append('Вы чувствуете себя лучше в дни с хорошим питанием — продолжайте!')
    return recs if recs else FALLBACK_RECOMMENDATIONS[:3]


def get_date_range():
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')
    date_to = datetime.fromisoformat(date_to_str) if date_to_str else datetime.utcnow()
    date_from = datetime.fromisoformat(date_from_str) if date_from_str else date_to - timedelta(days=30)
    return date_from, date_to


@analytics_bp.route('/correlation', methods=['GET'])
@jwt_required()
def get_correlation():
    user_id = int(get_jwt_identity())
    date_from, date_to = get_date_range()

    meals_with_mood = MealLog.query.filter(
        MealLog.user_id == user_id,
        MealLog.meal_time >= date_from,
        MealLog.meal_time <= date_to,
        MealLog.mood_score.isnot(None)
    ).order_by(MealLog.meal_time).all()

    if len(meals_with_mood) < MIN_RECORDS_FOR_ANALYSIS:
        total_meals = MealLog.query.filter(
            MealLog.user_id == user_id,
            MealLog.meal_time >= date_from,
            MealLog.meal_time <= date_to,
        ).count()
        return jsonify({
            'enough_data': False,
            'min_records': MIN_RECORDS_FOR_ANALYSIS,
            'meals_with_mood_count': len(meals_with_mood),
            'total_meals_count': total_meals,
            'recommendations': FALLBACK_RECOMMENDATIONS,
        })

    # Агрегируем по дням
    days = {}
    for m in meals_with_mood:
        day = m.meal_time.date().isoformat()
        if day not in days:
            days[day] = {'calories': [], 'moods': []}
        days[day]['calories'].append(m.calories)
        days[day]['moods'].append(m.mood_score)

    sorted_days = sorted(days.keys())
    calories_list = [sum(days[d]['calories']) for d in sorted_days]
    mood_list = [sum(days[d]['moods']) / len(days[d]['moods']) for d in sorted_days]

    if len(sorted_days) < MIN_RECORDS_FOR_ANALYSIS:
        return jsonify({
            'enough_data': False,
            'min_records': MIN_RECORDS_FOR_ANALYSIS,
            'meals_with_mood_count': len(meals_with_mood),
            'common_days': len(sorted_days),
            'recommendations': FALLBACK_RECOMMENDATIONS,
        })

    try:
        corr, p_value = pearsonr(calories_list, mood_list)
        corr = round(float(corr), 3)
        p_value = round(float(p_value), 4)
    except Exception:
        corr, p_value = 0.0, 1.0

    avg_cal = sum(calories_list) / len(calories_list)
    avg_mood = sum(mood_list) / len(mood_list)

    # Собираем топ продуктов для контекста рекомендаций
    food_counts: dict[str, int] = {}
    for m in meals_with_mood:
        food_counts[m.food_name] = food_counts.get(m.food_name, 0) + 1
    top_foods = sorted(food_counts, key=food_counts.get, reverse=True)[:5]

    # Типы приёмов пищи
    meal_type_counts: dict[str, int] = {}
    for m in meals_with_mood:
        meal_type_counts[m.meal_type] = meal_type_counts.get(m.meal_type, 0) + 1

    # GigaChat генерирует интерпретацию и рекомендации
    interpretation = _giga_interpretation(corr, p_value, avg_cal, avg_mood, len(sorted_days))
    recommendations = _giga_recommendations(corr, avg_cal, avg_mood, meal_type_counts, top_foods)

    return jsonify({
        'enough_data': True,
        'correlation': corr,
        'p_value': p_value,
        'significant': p_value < 0.05,
        'interpretation': interpretation,
        'data_points': len(sorted_days),
        'chart_data': [
            {'date': d, 'calories': round(calories_list[i], 1), 'mood': round(mood_list[i], 2)}
            for i, d in enumerate(sorted_days)
        ],
        'recommendations': recommendations,
    })


@analytics_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    user_id = int(get_jwt_identity())
    date_from, date_to = get_date_range()

    meals = MealLog.query.filter(
        MealLog.user_id == user_id,
        MealLog.meal_time >= date_from,
        MealLog.meal_time <= date_to
    ).all()

    meals_with_mood = [m for m in meals if m.mood_score is not None]
    mood_scores = [m.mood_score for m in meals_with_mood]

    avg_calories = sum(m.calories for m in meals) / len(meals) if meals else 0
    total_calories = sum(m.calories for m in meals)
    avg_mood = sum(mood_scores) / len(mood_scores) if mood_scores else 0

    meal_type_counts: dict[str, int] = {}
    for m in meals:
        meal_type_counts[m.meal_type] = meal_type_counts.get(m.meal_type, 0) + 1

    mood_by_day: dict[str, list] = {}
    for m in meals_with_mood:
        day = m.meal_time.date().isoformat()
        mood_by_day.setdefault(day, []).append(m.mood_score)
    mood_timeline = [
        {'date': d, 'avg_mood': round(sum(v) / len(v), 1)}
        for d, v in sorted(mood_by_day.items())
    ]

    cal_by_day: dict[str, float] = {}
    for m in meals:
        day = m.meal_time.date().isoformat()
        cal_by_day[day] = cal_by_day.get(day, 0) + m.calories
    calories_timeline = [
        {'date': d, 'calories': round(v, 1)}
        for d, v in sorted(cal_by_day.items())
    ]

    return jsonify({
        'period': {'from': date_from.isoformat(), 'to': date_to.isoformat()},
        'meals': {
            'count': len(meals),
            'total_calories': round(total_calories, 1),
            'avg_calories_per_meal': round(avg_calories, 1),
            'by_type': meal_type_counts,
        },
        'moods': {
            'count': len(meals_with_mood),
            'average': round(avg_mood, 1),
            'min': min(mood_scores, default=0),
            'max': max(mood_scores, default=0),
        },
        'mood_timeline': mood_timeline,
        'calories_timeline': calories_timeline,
    })
