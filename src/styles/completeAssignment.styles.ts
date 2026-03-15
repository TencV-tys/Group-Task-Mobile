// styles/completeAssignment.styles.ts
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const completeAssignmentStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  keyboardView: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 60,
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
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  headerSpacer: {
    width: 36
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  taskInfoSection: {
    marginBottom: 24
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 12
  },
  taskDetails: {
    gap: 8
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  taskDetailText: {
    fontSize: 14,
    color: '#495057'
  },
  timeInfoContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  timeOpen: {
    borderColor: '#b2f2bb',
  },
  timeWarning: {
    borderColor: '#ffec99',
  },
  timeCritical: {
    borderColor: '#ffc9c9',
  },
  timeWrongDay: {
    borderColor: '#e9ecef',
  },
  timeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  timeInfoTitle: {
    fontSize: 15,
    fontWeight: '600'
  },
  timeWarningText: {
    color: '#e67700'
  },
  timeCriticalText: {
    color: '#fa5252'
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  timeInstructions: {
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 8
  },
  timeMessage: {
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: 8
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8
  },
  warningText: {
    fontSize: 13,
    color: '#e67700',
    fontWeight: '500'
  },
  scheduleInfo: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 4
  },
  timeSlotInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#868e96',
    marginRight: 4
  },
  timeSlotValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057'
  },
  submissionWindowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
  },
  submissionWindowText: {
    fontSize: 11,
    color: '#868e96',
    fontStyle: 'italic'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6
  },
  sectionDescription: {
    fontSize: 13,
    color: '#868e96',
    marginBottom: 12,
    lineHeight: 18
  },
  photoUploadOptions: {
    flexDirection: 'row',
    gap: 12
  },
  photoOption: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  photoOptionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  photoOptionText: {
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: '500',
    textAlign: 'center'
  },
  photoPreviewContainer: {
    alignItems: 'center'
  },
  photoPreview: {
    width: width - 72,
    height: (width - 72) * 0.75,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    borderColor: '#ffc9c9',
  },
  photoActionText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500'
  },
  removeText: {
    color: '#fa5252'
  },
  notesGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  notesInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212529',
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: '#fa5252',
  },
  notesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8
  },
  charCount: {
    fontSize: 11,
    color: '#868e96'
  },
  errorText: {
    fontSize: 12,
    color: '#fa5252',
    marginTop: 4
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
    gap: 8
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  submitButtonTextDisabled: {
    color: '#868e96'
  },
  disabledText: {
    fontSize: 13,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic'
  },
  waitingText: {
    fontSize: 13,
    color: '#e67700',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic'
  },
  expiredMessage: {
    fontSize: 13,
    color: '#fa5252',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic'
  }
});