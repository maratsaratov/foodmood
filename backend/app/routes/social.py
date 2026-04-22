from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Like, Comment, Notification, User, MealLog

social_bp = Blueprint('social', __name__)

SPAM_WORDS = ['спам', 'реклама', 'казино', 'http://', 'https://', 'xxx']

MIN_COMMENT_LENGTH = 2
MAX_COMMENT_LENGTH = 1000


def check_spam(text):
    text_lower = text.lower()
    return any(word in text_lower for word in SPAM_WORDS)


def create_notification(user_id, notif_type, message):
    user = User.query.get(user_id)
    if user and user.notifications_enabled:
        notif = Notification(user_id=user_id, type=notif_type, message=message)
        db.session.add(notif)


@social_bp.route('/like', methods=['POST'])
@jwt_required()
def toggle_like():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    target_type = data.get('target_type')
    target_id = data.get('target_id')

    if target_type not in ('meal', 'review'):
        return jsonify({'error': 'Неверный тип объекта'}), 400

    existing = Like.query.filter_by(
        user_id=user_id, target_type=target_type, target_id=target_id
    ).first()

    if existing:
        db.session.delete(existing)
        db.session.commit()
        liked = False
    else:
        like = Like(user_id=user_id, target_type=target_type, target_id=target_id)
        db.session.add(like)

        # Уведомить владельца
        if target_type == 'meal':
            meal = MealLog.query.get(target_id)
            if meal and meal.user_id != user_id:
                liker = User.query.get(user_id)
                create_notification(
                    meal.user_id, 'like',
                    f'{liker.username} оценил(а) вашу запись о питании'
                )
        db.session.commit()
        liked = True

    count = Like.query.filter_by(target_type=target_type, target_id=target_id).count()
    return jsonify({'liked': liked, 'count': count})


@social_bp.route('/comments', methods=['POST'])
@jwt_required()
def add_comment():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    target_type = data.get('target_type')
    target_id = data.get('target_id')
    text = data.get('text', '').strip()

    if target_type not in ('meal', 'review'):
        return jsonify({'error': 'Неверный тип объекта'}), 400
    if len(text) < MIN_COMMENT_LENGTH:
        return jsonify({'error': 'Комментарий слишком короткий'}), 400
    if len(text) > MAX_COMMENT_LENGTH:
        return jsonify({'error': 'Комментарий слишком длинный'}), 400
    if check_spam(text):
        return jsonify({'error': 'Комментарий содержит недопустимые слова'}), 400

    comment = Comment(
        user_id=user_id,
        target_type=target_type,
        target_id=target_id,
        text=text
    )
    db.session.add(comment)

    # Уведомить владельца
    if target_type == 'meal':
        meal = MealLog.query.get(target_id)
        if meal and meal.user_id != user_id:
            commenter = User.query.get(user_id)
            create_notification(
                meal.user_id, 'comment',
                f'{commenter.username} прокомментировал(а) вашу запись'
            )

    db.session.commit()
    return jsonify(comment.to_dict()), 201


@social_bp.route('/comments/<string:target_type>/<int:target_id>', methods=['GET'])
@jwt_required()
def get_comments(target_type, target_id):
    if target_type not in ('meal', 'review'):
        return jsonify({'error': 'Неверный тип объекта'}), 400

    comments = Comment.query.filter_by(
        target_type=target_type, target_id=target_id, is_approved=True
    ).order_by(Comment.created_at.asc()).all()

    return jsonify([c.to_dict() for c in comments])


@social_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = int(get_jwt_identity())
    comment = Comment.query.get_or_404(comment_id)
    user = User.query.get(user_id)

    if comment.user_id != user_id and not user.is_admin:
        return jsonify({'error': 'Нет доступа'}), 403

    db.session.delete(comment)
    db.session.commit()
    return jsonify({'message': 'Комментарий удалён'})
