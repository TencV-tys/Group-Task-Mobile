// src/styles/groupMembers.styles.ts - Dark Mode Added
import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const makeGroupMembersStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: theme.textMuted,
    fontSize: 14
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  avatarBanner: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  avatarCircleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    height: 60,
    position: 'relative'
  },
  avatarContainer: {
    position: 'absolute',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.card
  },
  avatarImage: {
    backgroundColor: 'transparent',
  },
  moreAvatar: {
    borderColor: theme.border
  },
  moreAvatarText: {
    color: theme.textSecondary,
    fontWeight: '600',
    fontSize: 13
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 16
  },
  adminCrown: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.card,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.primary
  },
  groupInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  groupAvatarContainer: {
    position: 'relative',
    marginRight: 16
  },
  groupMainAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupAvatarImage: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.primary
  },
  groupAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold'
  },
  uploadingAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bgSecondary
  },
  editAvatarIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.card
  },
  groupTextInfo: {
    flex: 1
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4
  },
  groupDescription: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 8,
    lineHeight: 20
  },
  groupStats: {
    flexDirection: 'row',
    gap: 16
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    fontSize: 13,
    color: theme.textSecondary
  },
  adminActions: {
    flexDirection: 'row',
    gap: 12
  },
  adminButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  adminButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary
  },
  editButton: {},
  shareButton: {},
  inviteSection: {
    padding: 20,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text
  },
  inviteCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.bgSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 2
  },
  inviteInstructions: {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 12
  },
  regenerateButton: {
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start'
  },
  regenerateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.primaryBorder
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.primaryBorder
  },
  warningContent: {
    flex: 1
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 2
  },
  warningText: {
    fontSize: 13,
    color: theme.primary
  },
  membersSection: {
    padding: 20
  },
  errorContainer: {
    alignItems: 'center',
    padding: 30
  },
  errorText: {
    color: theme.error,
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    position: 'relative'
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  memberAvatarImage: {
    backgroundColor: 'transparent'
  },
  memberAvatarText: {
    fontWeight: 'bold',
    fontSize: 16
  },
  memberDetails: {
    flex: 1
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.primary
  },
  memberEmail: {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 2
  },
  memberJoined: {
    fontSize: 11,
    color: theme.textPlaceholder
  },
  memberActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center'
  },
  roleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border
  },
  demoteButton: {
    backgroundColor: theme.errorBg,
    borderColor: theme.errorBorder
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.errorBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.errorBorder
  },
  protectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.primaryBorder
  },
  currentUserBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.border
  },
  currentUserBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.textSecondary
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 8
  },
  leaveButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  leaveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14
  },
  disabledLeaveButton: {
    opacity: 0.7
  },
  leaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.error
  },
  disabledLeaveButtonText: {
    color: theme.textPlaceholder
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    backgroundColor: theme.card
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.bgSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalBody: {
    padding: 20
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.border
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textSecondary
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.bgSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textMuted
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden'
  },
  saveButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  saveButtonTextDisabled: {
    color: theme.textMuted
  },
  avatarEditSection: {
    alignItems: 'center',
    marginBottom: 24
  },
  editAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  editAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.primary
  },
  editAvatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarNote: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 8
  },
  removeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8
  },
  removeAvatarText: {
    fontSize: 13,
    color: theme.error
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8
  },
  inputGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border
  },
  textAreaGradient: {
    minHeight: 80
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    backgroundColor: 'transparent'
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  charCount: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: 'right',
    marginTop: 4
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.border
  },
  infoText: {
    fontSize: 13,
    color: theme.textMuted,
    flex: 1,
    lineHeight: 18
  },
  // Settings Modal Items
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    gap: 12
  },
  dangerItem: {
    borderBottomWidth: 0
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingsContent: {
    flex: 1
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2
  },
  settingsDescription: {
    fontSize: 13,
    color: theme.textMuted
  },
  dangerText: {
    color: theme.error
  },
  // Member Limit Banner Styles
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  limitText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  editLimitButton: {
    padding: 4,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  slider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sliderOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.bgSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  sliderOptionActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  sliderOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  sliderOptionTextActive: {
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.textMuted,
    marginBottom: 20,
    textAlign: 'center',
  },
  sliderOptionDisabled: {
    opacity: 0.3,
  },
});