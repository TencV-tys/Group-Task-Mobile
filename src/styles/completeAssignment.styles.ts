// src/styles/completeAssignment.styles.ts - COMPLETE with all missing styles

import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const makeCompleteAssignmentStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
  },
  keyboardView: {
    flex: 1,
  },
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  taskInfoSection: {
    marginBottom: 24,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
  },
  taskDetails: {
    gap: 8,
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskDetailText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  timeInfoContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  timeOpen: {
    borderColor: theme.primaryBorder,
  },
  timeWarning: {
    borderColor: theme.primaryBorder,
  },
  timeCritical: {
    borderColor: theme.errorBorder,
  },
  timeWrongDay: {
    borderColor: theme.border,
  },
  timeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeWarningText: {
    color: theme.primary,
  },
  timeCriticalText: {
    color: theme.error,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeInstructions: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  timeMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 8,
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scheduleInfo: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  timeSlotInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  timeSlotLabel: {
    fontSize: 12,
    marginRight: 4,
    color: theme.textMuted,
  },
  timeSlotValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  submissionWindowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.bgSecondary,
  },
  submissionWindowText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: theme.textMuted,
  },
  
  // ===== TIME SLOT SELECTOR STYLES =====
  timeSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  timeSlotCardSelected: {
    borderWidth: 2,
  },
  disabledCard: {
    opacity: 0.6,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timeSlotTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotPoints: {
    fontSize: 12,
    marginTop: 2,
  },

  // ===== SUCCESS MESSAGE STYLES (NEW) =====
  successMessageContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successMessage: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  successSubMessage: {
    fontSize: 12,
    marginTop: 4,
  },
  successFooter: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
  },
  
  // ===== SUBMIT BUTTON SUCCESS STATE (NEW) =====
  submitButtonSuccess: {
    opacity: 0.9,
  },
  
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: theme.text,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
    color: theme.textMuted,
  },
  photoUploadOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoOption: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.primaryBorder,
  },
  photoOptionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  photoOptionText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    color: theme.primary,
  },
  photoPreviewContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: width - 72,
    height: (width - 72) * 0.75,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  photoActionButton: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 80,
  },
  photoActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  removeGradient: {
    borderWidth: 1,
    borderColor: theme.errorBorder,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  removeText: {
    color: theme.error,
  },
  notesGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  notesInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
    color: theme.text,
  },
  inputError: {
    borderColor: theme.error,
  },
  notesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCount: {
    fontSize: 11,
    color: theme.textMuted,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    color: theme.error,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonWrongDay: {
    opacity: 0.7,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  submitButtonTextDisabled: {
    color: theme.textMuted,
  },
  disabledText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    color: theme.textMuted,
  },
  waitingText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    color: theme.primary,
  },
  expiredMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    color: theme.error,
  },
  // Add these to your styles object
completedTimeSlotCard: {
  opacity: 0.7,
  borderWidth: 1,
},
completedBadge: {
  fontSize: 11,
  fontWeight: '600',
  marginTop: 4,
},
completedTimeInfoContainer: {
  borderWidth: 1,
  borderColor: '#b2f2bb',
},
completedMessage: {
  fontSize: 16,
  fontWeight: '600',
  textAlign: 'center',
  marginVertical: 8,
},
completedSubMessage: {
  fontSize: 12,
  textAlign: 'center',
  marginBottom: 12,
},
submitButtonCompleted: {
  opacity: 0.8,
},
completedFooter: {
  fontSize: 12,
  textAlign: 'center',
  marginTop: 12,
  marginBottom: 8,
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
loadingText: {
  marginTop: 12,
  fontSize: 14,
},
});