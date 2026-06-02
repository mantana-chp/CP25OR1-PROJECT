import { useFormik } from 'formik'
import {
  IReminder,
  reminderInitValue,
  reminderValidationSchema,
} from '@/src/domain/reminder.domain'

export const createFormikInstance = (initialValues?: IReminder) => {
  return useFormik<IReminder>({
    initialValues: initialValues || {
      ...reminderInitValue({} as IReminder),
    },
    enableReinitialize: true,
    validationSchema: reminderValidationSchema,
    validateOnBlur: false,
    validateOnChange: false,
    onSubmit: () => {},
  })
}
