import { atom } from 'nanostores';

export type NotificationType = 'alert' | 'success' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
}

// Mock notification data - in production this would come from API
export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Budget Alert',
    description: 'Dining has reached 95% of its monthly limit.',
    time: '2m ago',
  },
  {
    id: '2',
    type: 'success',
    title: 'Salary Received',
    description: 'Acme Corp deposited Rp51.025.000.',
    time: '4h ago',
  },
  {
    id: '3',
    type: 'alert',
    title: 'Budget exceeded',
    description: 'Dining out is 120% over budget',
    time: '2h ago',
  },
  {
    id: '4',
    type: 'info',
    title: 'Asset update reminder',
    description: 'Update your stock portfolio',
    time: '1d ago',
  },
];

// Notification dropdown open state
export const notificationDropdownOpen = atom<boolean>(false);

// Notifications list
export const notifications = atom<Notification[]>(mockNotifications);

// Unread count
export const unreadCount = atom<number>(3);

/**
 * Toggle notification dropdown
 */
export function toggleNotificationDropdown(): void {
  notificationDropdownOpen.set(!notificationDropdownOpen.get());
}

/**
 * Close notification dropdown
 */
export function closeNotificationDropdown(): void {
  notificationDropdownOpen.set(false);
}

/**
 * Open notification dropdown
 */
export function openNotificationDropdown(): void {
  notificationDropdownOpen.set(true);
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(): void {
  unreadCount.set(0);
}

/**
 * Add a new notification
 */
export function addNotification(notification: Omit<Notification, 'id'>): void {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const newNotification: Notification = { ...notification, id };
  notifications.set([newNotification, ...notifications.get()]);
  unreadCount.set(unreadCount.get() + 1);
}
