export const API_RESPONSE_STATUS = {
    SUCCESS: {
        CODE: "000",
        DESCRIPTION: "Success",
    },
    FAILURE: {
        CODE: "888",
        DESCRIPTION: "Failure",
    },
} as const;

export const REMINDER_STATUS = {
    TO_DO: "To Do",
    DONE: "Done",
    OVERDUE: "Overdue",
} as const;