// src/styles/home.styles.ts
import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const makeHomeStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 80,
    paddingTop: 8,
  },

  // ── Overdue Banner ───────────────────────────────────────────────────────
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
    backgroundColor: theme.errorBg,
    borderWidth: 1,
    borderColor: theme.errorBorder,
    borderRadius: 12,
    padding: 12,
  },
  overdueBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  overdueBannerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  overdueBannerLink: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Sections ─────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '600',
  },

  // ── Task Cards ────────────────────────────────────────────────────────────
  tasksContainer: {
    gap: 8,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  // left accent dot on task card
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  groupPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  groupPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskMetaText: {
    fontSize: 11,
    color: theme.textMuted,
    textTransform: 'capitalize',
  },
  taskRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  taskPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 2,
  },
  taskDueLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Empty today state ────────────────────────────────────────────────────
  emptyFocusCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyFocusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textMuted,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyFocusSub: {
    fontSize: 13,
    color: theme.textPlaceholder,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Groups horizontal scroll ──────────────────────────────────────────────
  groupsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  groupCard: {
    width: 120,
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
    marginBottom: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  groupAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 10,
  },
  groupAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupAvatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  // new: task count badge on group card
  groupTaskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    marginBottom: 4,
  },
  groupTaskBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  groupRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: theme.bgTertiary,
  },
  groupRole: {
    fontSize: 10,
    color: theme.textMuted,
    fontWeight: '500',
  },
  adminRole: {
    color: theme.primary,
    fontWeight: '600',
  },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 8,
    gap: 6,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Activity ──────────────────────────────────────────────────────────────
  activityContainer: {
    gap: 8,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    position: 'relative',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: theme.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: theme.textMuted,
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
  },

  // ── Empty / Loading / Error ───────────────────────────────────────────────
  emptyState: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textMuted,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.textPlaceholder,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.error,
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Bottom Nav ────────────────────────────────────────────────────────────
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.card,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2,
  },
  createButton: {
    marginTop: -20,
  },
  createButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  multiSlotBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  marginLeft: 6,
},
multiSlotBadgeText: {
  fontSize: 9,
  fontWeight: '500',
  marginLeft: 2,
},
});