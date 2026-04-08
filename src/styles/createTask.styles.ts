// src/styles/createTask.styles.ts - COMPLETE UPDATED VERSION
import { StyleSheet } from 'react-native';
import { Theme } from '../context/ThemeContext';

export const makeCreateTaskStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    minHeight: 60,
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
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // ─── Scroll / Content ─────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // ─── Banners ──────────────────────────────────────────────────────────────
  groupInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  groupInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 12,
    color: theme.primary,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  groupNote: {
    fontSize: 12,
    color: theme.textSecondary,
    fontStyle: 'italic',
    marginLeft: 24,
  },
  warningContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  infoContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  warningMessage: {
    fontSize: 13,
    color: theme.primary,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 2,
  },
  infoMessage: {
    fontSize: 13,
    color: theme.primary,
    lineHeight: 18,
  },

  // ─── Form Section ─────────────────────────────────────────────────────────
  formSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  // ─── Inputs ───────────────────────────────────────────────────────────────
  inputGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputErrorGradient: {
    borderColor: theme.error,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  textAreaGradient: {
    minHeight: 100,
  },
  helperText: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: {
    color: theme.error,
    fontSize: 10,
    marginTop: 2,
  },

  // ─── Points Suggestion Banner ─────────────────────────────────────────────
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center', 
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.primaryBorder,
    backgroundColor: theme.primaryLight,
  },
  suggestionTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    lineHeight: 15,
    flexWrap: 'wrap',
  },
  suggestionUseButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  suggestionUseButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── Points ───────────────────────────────────────────────────────────────
  pointsLimitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsLimitText: {
    fontSize: 11,
    color: theme.error,
    fontWeight: '600',
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsInputGradient: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pointsInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    width: 50,
  },
  pointsUsageContainer: {
    marginBottom: 20,
  },
  pointsUsageBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.bgTertiary,
    marginBottom: 8,
  },
  pointsUsageFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 4,
  },
  pointsUsageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsUsageText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  pointsUsageFull: {
    color: theme.primary,
    fontWeight: '600',
  },
  pointsRemainingText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '500',
  },
  pointsFullText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '600',
  },

  // ─── Category Chips ───────────────────────────────────────────────────────
  categoryChipsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  categoryChipActive: {
    borderColor: theme.primary,
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // ─── Frequency ────────────────────────────────────────────────────────────
  frequencyContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  frequencyButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    borderColor: theme.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  frequencyButtonTextActive: {
    color: '#fff',
  },

  // ─── Time Slots ───────────────────────────────────────────────────────────
  timeSlotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSlotsTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  timeSlotsSubtitle: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2,
  },
  addTimeSlotButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  addTimeSlotDisabled: {
    opacity: 0.6,
  },
  addTimeSlotGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  addTimeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  addTimeSlotTextDisabled: {
    color: theme.textMuted,
  },
  emptyTimeSlots: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: theme.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
  },
  emptyTimeSlotsText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textMuted,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyTimeSlotsSubtext: {
    fontSize: 12,
    color: theme.textPlaceholder,
    textAlign: 'center',
  },
  timeSlotsList: {
    gap: 8,
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  timeSlotItemError: {
    borderColor: theme.error,
  },
  timeSlotInfo: {
    flex: 1,
    marginRight: 8,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeSlotTime: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  timeSlotLabel: {
    fontSize: 12,
    color: theme.textMuted,
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.primary,
  },
  pointsBadgeErrorText: {
    color: theme.error,
  },
  timeSlotActions: {
    flexDirection: 'row',
    gap: 6,
  },
  timeSlotActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.errorBorder,
  },
  limitWarningText: {
    flex: 1,
    fontSize: 12,
    color: theme.error,
  },

  // ─── Days ─────────────────────────────────────────────────────────────────
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  dayButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    borderColor: theme.primary,
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  dayButtonTextActive: {
    color: '#fff',
  },

  // ─── Toggle ───────────────────────────────────────────────────────────────
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleSwitch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.bgTertiary,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: theme.primary,
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    transform: [{ translateX: 22 }],
  },

  // ─── Error Box ────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.errorBorder,
  },

  // ─── Action Buttons ───────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  draftButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.textMuted,
  },
  draftButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  draftButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  submitButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  submitButtonTextDisabled: {
    color: theme.textMuted,
  },
  buttonDisabled: {
    opacity: 0.7,
  },

  // ─── Info Box ─────────────────────────────────────────────────────────────
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  infoList: {
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
    flex: 1,
  },

  // ─── Confirmation Modal ───────────────────────────────────────────────────
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContainer: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmModalCancelButton: {
    backgroundColor: theme.bgTertiary,
  },
  confirmModalConfirmButton: {},
  confirmModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  confirmModalConfirmButtonText: {
    color: '#fff',
  },
});