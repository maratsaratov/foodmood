from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import MealLog, MoodLog
from datetime import datetime, timedelta
from scipy.stats import pearsonr


analytics_bp = Blueprint('analytics', __name__)

MIN_RECORDS_FOR_ANALYSIS = 7

GENERAL_RECOMMENDATIONS = [
    'Старайтесь есть регулярно — 3-5 раз в день',
    'Включайте в рацион больше овощей и фруктов',
    'Ограничьте потребление сахара и фастфуда',
    'Пейте достаточно воды — около 2 литров в день',
    'Не пропускайте завтрак — это важно для настроения',
]


def get_date_range():
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')
    date_to = datetime.fromisoformat(date_to_str) if date_to_str else datetime.utcnow()
    date_from = datetime.fromisoformat(date_from_str) if date_from_str else date_to - timedelta(days=30)
    return date_from, date_to


@analytics_bp.route('/correlation', methods=['GET'])
@jwt_required()
def get_correlation():
    """Корреляция калорий и настроения по методу Пирсона"""
    user_id = int(get_jwt_identity())
    date_from, date_to = get_date_range()

    meals = MealLog.query.filter(
        MealLog.user_id == user_id,
        MealLog.meal_time >= date_from,
        MealLog.meal_time <= date_to
    ).order_by(MealLog.meal_time).all()

    moods = MoodLog.query.filter(
        MoodLog.user_id == user_id,
        MoodLog.logged_at >= date_from,
        MoodLog.logged_at <= date_to
    ).order_by(MoodLog.logged_at).all()

    if len(meals) < MIN_RECORDS_FOR_ANALYSIS or len(moods) < MIN_RECORDS_FOR_ANALYSIS:
        return jsonify({
            'enough_data': False,
            'min_records': MIN_RECORDS_FOR_ANALYSIS,
            'meals_count': len(meals),
            'moods_count': len(moods),
            'recommendations': GENERAL_RECOMMENDATIONS
        })

    # Агрегируем по дням
    meals_by_day = {}
    for m in meals:
        day = m.meal_time.date().isoformat()
        if day not in meals_by_day:
            meals_by_day[day] = 0
        meals_by_day[day] += m.calories

    moods_by_day = {}
    for m in moods:
        day = m.logged_at.date().isoformat()
        if day not in moods_by_day:
            moods_by_day[day] = []
        moods_by_day[day].append(m.mood_score)
    moods_by_day = {d: sum(v) / len(v) for d, v in moods_by_day.items()}

    common_days = sorted(set(meals_by_day.keys()) & set(moods_by_day.keys()))

    if len(common_days) < MIN_RECORDS_FOR_ANALYSIS:
        return jsonify({
            'enough_data': False,
            'min_records': MIN_RECORDS_FOR_ANALYSIS,
            'common_days': len(common_days),
            'recommendations': GENERAL_RECOMMENDATIONS
        })

    calories_list = [meals_by_day[d] for d in common_days]
    mood_list = [moods_by_day[d] for d in common_days]

    try:
        corr, p_value = pearsonr(calories_list, mood_list)
        corr = round(float(corr), 3)
        p_value = round(float(p_value), 4)
    except Exception:
        corr, p_value = 0.0, 1.0

    # Интерпретация
    if corr > 0.5:
        interpretation = 'Сильная положительная связь: больше калорий — лучше настроение'
    elif corr > 0.2:
        interpretation = 'Умеренная положительная связь между питанием и настроением'
    elif corr < -0.5:
        interpretation = 'Сильная отрицательная связь: переедание ухудшает настроение'
    elif corr < -0.2:
        interpretation = 'Умеренная отрицательная связь: стоит следить за количеством еды'
    else:
        interpretation = 'Явной связи между калориями и настроением не выявлено'

    return jsonify({
        'enough_data': True,
        'correlation': corr,
        'p_value': p_value,
        'significant': p_value < 0.05,
        'interpretation': interpretation,
        'data_points': len(common_days),
        'chart_data': [
            {'date': d, 'calories': meals_by_day[d], 'mood': moods_by_day[d]}
            for d in common_days
        ],
        'recommendations': _generate_recommendations(corr, calories_list, mood_list)
    })


@analytics_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    """Сводная статистика за период"""
    user_id = int(get_jwt_identity())
    date_from, date_to = get_date_range()

    meals = MealLog.query.filter(
        MealLog.user_id == user_id,
        MealLog.meal_time >= date_from,
        MealLog.meal_time <= date_to
    ).all()

    moods = MoodLog.query.filter(
        MoodLog.user_id == user_id,
        MoodLog.logged_at >= date_from,
        MoodLog.logged_at <= date_to
    ).all()

    avg_calories = sum(m.calories for m in meals) / len(meals) if meals else 0
    avg_mood = sum(m.mood_score for m in moods) / len(moods) if moods else 0
    total_calories = sum(m.calories for m in meals)

    # Распределение по типам питания
    meal_type_counts = {}
    for m in meals:
        meal_type_counts[m.meal_type] = meal_type_counts.get(m.meal_type, 0) + 1

    # График настроения по дням
    mood_timeline = {}
    for m in moods:
        day = m.logged_at.date().isoformat()
        if day not in mood_timeline:
            mood_timeline[day] = []
        mood_timeline[day].append(m.mood_score)
    mood_timeline = [
        {'date': d, 'avg_mood': round(sum(v) / len(v), 1)}
        for d, v in sorted(mood_timeline.items())
    ]

    # График калорий по дням
    calories_timeline = {}
    for m in meals:
        day = m.meal_time.date().isoformat()
        calories_timeline[day] = calories_timeline.get(day, 0) + m.calories
    calories_timeline = [
        {'date': d, 'calories': round(v, 1)}
        for d, v in sorted(calories_timeline.items())
    ]

    return jsonify({
        'period': {
            'from': date_from.isoformat(),
            'to': date_to.isoformat()
        },
        'meals': {
            'count': len(meals),
            'total_calories': round(total_calories, 1),
            'avg_calories_per_meal': round(avg_calories, 1),
            'by_type': meal_type_counts
        },
        'moods': {
            'count': len(moods),
            'average': round(avg_mood, 1),
            'min': min((m.mood_score for m in moods), default=0),
            'max': max((m.mood_score for m in moods), default=0)
        },
        'mood_timeline': mood_timeline,
        'calories_timeline': calories_timeline
    })


def _generate_recommendations(corr, calories, moods):
    recs = []
    avg_cal = sum(calories) / len(calories) if calories else 0
    avg_mood = sum(moods) / len(moods) if moods else 5

    if avg_cal > 2500:
        recs.append('Вы потребляете много калорий. Попробуйте уменьшить порции.')
    elif avg_cal < 1200:
        recs.append('Вы потребляете мало калорий. Убедитесь, что питаетесь достаточно.')

    if avg_mood < 5:
        recs.append('Ваше среднее настроение ниже нормы. Обратите внимание на режим питания и отдыха.')

    if corr < -0.3:
        recs.append('Данные показывают: в дни с большим количеством еды ваше настроение хуже. Попробуйте есть меньше, но чаще.')
    elif corr > 0.3:
        recs.append('Вы чувствуете себя лучше в дни с хорошим питанием. Продолжайте в том же духе!')

    if not recs:
        recs = GENERAL_RECOMMENDATIONS[:3]

    return recs
