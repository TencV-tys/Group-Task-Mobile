// src/styles/groupMembers.styles.ts
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const groupMembersStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#868e96',
    fontSize: 14
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
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
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  avatarBanner: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
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
    borderColor: 'white'
  },
  avatarImage: {
    backgroundColor: 'transparent',
  },
  moreAvatar: {
    borderColor: '#e9ecef'
  },
  moreAvatarText: {
    color: '#495057',
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
    backgroundColor: 'white',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b8a3e'
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
    borderColor: '#2b8a3e'
  },
  groupAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },
  uploadingAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
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
    borderColor: 'white'
  },
  groupTextInfo: {
    flex: 1
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  groupDescription: {
    fontSize: 14,
    color: '#868e96',
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
    color: '#495057'
  },
  adminActions: {
    flexDirection: 'row',
    gap: 12
  },
  adminButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
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
    borderColor: '#e9ecef'
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057'
  },
  editButton: {},
  shareButton: {},
  inviteSection: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
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
    color: '#212529'
  },
  inviteCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    letterSpacing: 2
  },
  inviteInstructions: {
    fontSize: 13,
    color: '#868e96',
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
    borderColor: '#ffd43b'
  },
  regenerateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e67700'
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
    borderColor: '#ffd43b'
  },
  warningContent: {
    flex: 1
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e67700',
    marginBottom: 2
  },
  warningText: {
    fontSize: 13,
    color: '#e67700'
  },
  membersSection: {
    padding: 20
  },
  errorContainer: {
    alignItems: 'center',
    padding: 30
  },
  errorText: {
    color: '#fa5252',
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
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#212529'
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
    color: '#2b8a3e'
  },
  memberEmail: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 2
  },
  memberJoined: {
    fontSize: 11,
    color: '#adb5bd'
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
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  demoteButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffc9c9'
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  protectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd43b'
  },
  currentUserBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  currentUserBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#495057'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 14,
    color: '#868e96',
    marginTop: 8
  },
  leaveButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
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
    color: '#fa5252'
  },
  disabledLeaveButtonText: {
    color: '#adb5bd'
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
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
    borderTopColor: '#e9ecef'
  },
  modalCloseButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057'
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#868e96'
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
    color: 'white'
  },
  saveButtonTextDisabled: {
    color: '#868e96'
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
    borderColor: '#2b8a3e'
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
    color: '#868e96',
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
    color: '#fa5252'
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  inputGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  textAreaGradient: {
    minHeight: 80
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#212529',
    backgroundColor: 'transparent'
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  charCount: {
    fontSize: 11,
    color: '#868e96',
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
    borderColor: '#e9ecef'
  },
  infoText: {
    fontSize: 13,
    color: '#868e96',
    flex: 1,
    lineHeight: 18
  },
  // Settings Modal Items
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#212529',
    marginBottom: 2
  },
  settingsDescription: {
    fontSize: 13,
    color: '#868e96'
  },
  dangerText: {
    color: '#fa5252'
  },
  // ===== NEW: Member Limit Banner Styles =====
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
    borderColor: '#e9ecef',
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
    color: '#212529',
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  sliderOptionActive: {
    backgroundColor: '#2b8a3e',
    borderColor: '#2b8a3e',
  },
  sliderOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  sliderOptionTextActive: {
    color: 'white',
  },
  modalSubtitle: {
  fontSize: 14,
  color: '#868e96',
  marginBottom: 20,
  textAlign: 'center',
},
  sliderOptionDisabled: {
    opacity: 0.3,
  },
});