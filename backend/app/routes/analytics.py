from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import MealLog
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
            'recommendations': GENERAL_RECOMMENDATIONS
        })

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
            'recommendations': GENERAL_RECOMMENDATIONS
        })

    try:
        corr, p_value = pearsonr(calories_list, mood_list)
        corr = round(float(corr), 3)
        p_value = round(float(p_value), 4)
    except Exception:
        corr, p_value = 0.0, 1.0

    if corr > 0.5:
        interpretation = 'Сильная положительная связь: в дни с большим количеством калорий настроение лучше'
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
        'data_points': len(sorted_days),
        'chart_data': [
            {'date': d, 'calories': round(calories_list[i], 1), 'mood': round(mood_list[i], 2)}
            for i, d in enumerate(sorted_days)
        ],
        'recommendations': _generate_recommendations(corr, calories_list, mood_list)
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

    meal_type_counts = {}
    for m in meals:
        meal_type_counts[m.meal_type] = meal_type_counts.get(m.meal_type, 0) + 1

    mood_by_day = {}
    for m in meals_with_mood:
        day = m.meal_time.date().isoformat()
        mood_by_day.setdefault(day, []).append(m.mood_score)
    mood_timeline = [
        {'date': d, 'avg_mood': round(sum(v) / len(v), 1)}
        for d, v in sorted(mood_by_day.items())
    ]

    cal_by_day = {}
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
            'by_type': meal_type_counts
        },
        'moods': {
            'count': len(meals_with_mood),
            'average': round(avg_mood, 1),
            'min': min(mood_scores, default=0),
            'max': max(mood_scores, default=0)
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
        recs.append('Среднее настроение ниже нормы. Обратите внимание на режим питания.')
    if corr < -0.3:
        recs.append('В дни с большим количеством еды настроение хуже. Попробуйте есть меньше, но чаще.')
    elif corr > 0.3:
        recs.append('Вы чувствуете себя лучше в дни с хорошим питанием. Продолжайте!')
    return recs if recs else GENERAL_RECOMMENDATIONS[:3]
