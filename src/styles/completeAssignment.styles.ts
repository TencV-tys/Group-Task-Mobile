// src/styles/completeAssignment.styles.ts - Dark Mode Version
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
  },
  timeSlotLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  timeSlotValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  submissionWindowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  submissionWindowText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
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
  },
  removeText: {},
  notesGradient: {
    borderRadius: 10,
    borderWidth: 1,
  },
  notesInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
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
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
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
  },
  submitButtonTextDisabled: {},
  disabledText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  waitingText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  expiredMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});