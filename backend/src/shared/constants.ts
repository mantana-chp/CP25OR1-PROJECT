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

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
] as const;