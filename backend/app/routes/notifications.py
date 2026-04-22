from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Notification

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    notifs = Notification.query.filter_by(user_id=user_id)\
        .order_by(Notification.created_at.desc())\
        .paginate(page=page, per_page=30)
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({
        'items': [n.to_dict() for n in notifs.items],
        'total': notifs.total,
        'unread_count': unread_count,
        'pages': notifs.pages
    })


@notifications_bp.route('/read-all', methods=['POST'])
@jwt_required()
def mark_all_read():
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'Все уведомления прочитаны'})


@notifications_bp.route('/<int:notif_id>/read', methods=['POST'])
@jwt_required()
def mark_read(notif_id):
    user_id = int(get_jwt_identity())
    notif = Notification.query.get_or_404(notif_id)
    if notif.user_id != user_id:
        return jsonify({'error': 'Нет доступа'}), 403
    notif.is_read = True
    db.session.commit()
    return jsonify(notif.to_dict())
