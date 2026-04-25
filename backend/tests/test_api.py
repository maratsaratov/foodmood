import pytest
from app import create_app, db
from app.models import User, MealLog


@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-secret'
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    res = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'username': 'testuser'
    })
    token = res.get_json()['token']
    return {'Authorization': f'Bearer {token}'}


# ── Auth ──────────────────────────────────────────────────────────

def test_register(client):
    res = client.post('/api/auth/register', json={
        'email': 'new@example.com', 'password': 'password123', 'username': 'newuser'
    })
    assert res.status_code == 201
    assert 'token' in res.get_json()


def test_register_duplicate_email(client, auth_headers):
    res = client.post('/api/auth/register', json={
        'email': 'test@example.com', 'password': 'password123', 'username': 'other'
    })
    assert res.status_code == 409


def test_login(client, auth_headers):
    res = client.post('/api/auth/login', json={
        'email': 'test@example.com', 'password': 'password123'
    })
    assert res.status_code == 200
    assert 'token' in res.get_json()


def test_login_wrong_password(client, auth_headers):
    res = client.post('/api/auth/login', json={
        'email': 'test@example.com', 'password': 'wrong'
    })
    assert res.status_code == 401


# ── Meals ─────────────────────────────────────────────────────────

def test_create_meal_basic(client, auth_headers):
    res = client.post('/api/meals/', json={
        'food_name': 'Гречка', 'calories': 350, 'meal_type': 'обед'
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['food_name'] == 'Гречка'
    assert data['mood_score'] is None  # настроение не указано


def test_create_meal_with_mood(client, auth_headers):
    res = client.post('/api/meals/', json={
        'food_name': 'Овсянка', 'calories': 300, 'mood_score': 8
    }, headers=auth_headers)
    assert res.status_code == 201
    assert res.get_json()['mood_score'] == 8


def test_create_meal_invalid_mood(client, auth_headers):
    """mood_score вне диапазона 1-10 должен игнорироваться (None)"""
    res = client.post('/api/meals/', json={
        'food_name': 'Тест', 'calories': 200, 'mood_score': 15
    }, headers=auth_headers)
    assert res.status_code == 201
    assert res.get_json()['mood_score'] is None


def test_create_meal_invalid_calories(client, auth_headers):
    res = client.post('/api/meals/', json={
        'food_name': 'Тест', 'calories': -100
    }, headers=auth_headers)
    assert res.status_code == 400


def test_create_meal_missing_name(client, auth_headers):
    res = client.post('/api/meals/', json={'calories': 200}, headers=auth_headers)
    assert res.status_code == 400


def test_get_meals(client, auth_headers):
    client.post('/api/meals/', json={'food_name': 'Тест', 'calories': 200}, headers=auth_headers)
    res = client.get('/api/meals/', headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()['total'] >= 1


def test_update_meal_mood(client, auth_headers):
    create = client.post('/api/meals/', json={
        'food_name': 'Суп', 'calories': 150
    }, headers=auth_headers)
    meal_id = create.get_json()['id']
    res = client.put(f'/api/meals/{meal_id}', json={'mood_score': 7}, headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()['mood_score'] == 7


def test_delete_meal(client, auth_headers):
    create = client.post('/api/meals/', json={
        'food_name': 'Суп', 'calories': 150
    }, headers=auth_headers)
    meal_id = create.get_json()['id']
    res = client.delete(f'/api/meals/{meal_id}', headers=auth_headers)
    assert res.status_code == 200


# ── Analytics ─────────────────────────────────────────────────────

def test_summary_empty(client, auth_headers):
    res = client.get('/api/analytics/summary', headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['meals']['count'] == 0
    assert data['moods']['count'] == 0


def test_correlation_not_enough_data(client, auth_headers):
    res = client.get('/api/analytics/correlation', headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()['enough_data'] is False


def test_summary_with_mood(client, auth_headers):
    """Статистика настроения формируется из записей еды с mood_score"""
    for i in range(3):
        client.post('/api/meals/', json={
            'food_name': f'Блюдо {i}', 'calories': 300 + i * 50,
            'mood_score': 5 + i
        }, headers=auth_headers)
    # Одна запись без настроения
    client.post('/api/meals/', json={
        'food_name': 'Без настроения', 'calories': 200
    }, headers=auth_headers)

    res = client.get('/api/analytics/summary', headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data['meals']['count'] == 4        # все 4 записи питания
    assert data['moods']['count'] == 3        # только 3 с mood_score


# ── Health ────────────────────────────────────────────────────────

def test_health(client):
    res = client.get('/api/health')
    assert res.status_code == 200
