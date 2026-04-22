import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'd MMMM yyyy, HH:mm', { locale: ru });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr) {
  try {
    return format(parseISO(dateStr), 'd MMM', { locale: ru });
  } catch {
    return dateStr;
  }
}

export function moodEmoji(score) {
  if (score >= 9) return '😄';
  if (score >= 7) return '🙂';
  if (score >= 5) return '😐';
  if (score >= 3) return '😕';
  return '😞';
}

export function moodLabel(score) {
  if (score >= 9) return 'Отлично';
  if (score >= 7) return 'Хорошо';
  if (score >= 5) return 'Нормально';
  if (score >= 3) return 'Плохо';
  return 'Очень плохо';
}

export function mealTypeLabel(type) {
  const map = {
    завтрак: '🌅 Завтрак',
    обед: '☀️ Обед',
    ужин: '🌙 Ужин',
    перекус: '🍎 Перекус',
  };
  return map[type] || type;
}

export function getInitials(username) {
  return (username || '?').slice(0, 2).toUpperCase();
}

export function getApiError(err) {
  return err?.response?.data?.error || 'Что-то пошло не так';
}
