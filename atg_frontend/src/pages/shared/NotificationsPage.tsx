import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, Inbox, Calendar, Filter, RotateCcw } from 'lucide-react';
import { notificationApi } from '../../api/notificationApi';
import type { Notification } from '../../types/notification.types';
import { relativeTime } from '../../utils/relativeTime';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showAllDays, setShowAllDays] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { refetchUnreadCount } = useUnreadNotifications();

  useEffect(() => {
    notificationApi
      .list()
      .then(setNotifications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      const updated = await notificationApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
      refetchUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      refetchUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Seven days ago threshold timestamp
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const filteredNotifications = notifications.filter((n) => {
    // Unread filter
    if (filter === 'unread' && !n.unread) return false;

    const createdAt = new Date(n.createdAt);

    // Custom date filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (createdAt < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (createdAt > end) return false;
    }

    // Default 7-day filter if no custom date filter is set and showAllDays is false
    if (!startDate && !endDate && !showAllDays) {
      if (createdAt < sevenDaysAgo) return false;
    }

    return true;
  });

  const hasDateFilter = Boolean(startDate || endDate);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-fadeIn text-white">
      {/* Page Header */}
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('nav.notifications')}</h1>
            {unreadCount > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Updates on jobs, applications, status changes, and account activity.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Read Status Filter */}
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'unread' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Mark All Read Button */}
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-sm border ${
              unreadCount > 0
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
            }`}
          >
            <CheckCheck size={15} />
            Mark all as read
          </button>
        </div>
      </div>

      {/* Date Filter & 7-Day Limit Controls */}
      <div className="px-8 py-3 bg-slate-800/50 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span>Filter Date:</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
            />
            {hasDateFilter && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-400 hover:underline flex items-center gap-1 px-2 py-1 bg-rose-950/30 border border-rose-800/40 rounded-lg"
              >
                <RotateCcw className="h-3 w-3" /> Clear Date Filter
              </button>
            )}
          </div>
        </div>

        {/* Show 7 days vs Show All button */}
        {!hasDateFilter && (
          <button
            onClick={() => setShowAllDays((prev) => !prev)}
            className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-blue-400" />
            {showAllDays ? 'Showing All Notifications (Click for 7 Days)' : 'Show All Notifications (Beyond 7 Days)'}
          </button>
        )}
      </div>

      {loading && (
        <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          Loading notifications...
        </div>
      )}

      {error && (
        <div className="p-8 text-center text-red-400 text-sm bg-red-950/20 border-b border-red-900/30">
          {error}
        </div>
      )}

      {!loading && !error && filteredNotifications.length === 0 && (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Inbox size={40} className="text-slate-600" />
          <p className="text-base font-semibold text-slate-300">No notifications found</p>
          <p className="text-xs text-slate-500 max-w-sm">
            {filter === 'unread'
              ? 'You have read all your notifications!'
              : !showAllDays && !hasDateFilter
              ? 'No notifications in the last 7 days. Click "Show All Notifications" to view older history.'
              : 'There are no notifications matching your date filter.'}
          </p>
          {!showAllDays && !hasDateFilter && (
            <button
              onClick={() => setShowAllDays(true)}
              className="mt-2 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl hover:bg-blue-500/20 transition-all cursor-pointer"
            >
              Show All History
            </button>
          )}
        </div>
      )}

      {!loading && !error && filteredNotifications.length > 0 && (
        <div className="divide-y divide-slate-800/80">
          {filteredNotifications.map((n) => (
            <button
              key={n.id}
              onClick={() => n.unread && handleMarkRead(n.id)}
              className={`w-full text-left p-6 flex items-start gap-4 transition-colors ${
                n.unread ? 'bg-slate-800/50 hover:bg-slate-800' : 'hover:bg-slate-800/30 opacity-80'
              }`}
            >
              <div
                className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-all ${
                  n.unread
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm ${n.unread ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                    {n.title}
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.body}</p>
                {n.unread && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md mt-2">
                    Click to mark noticed
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
