// ── Timeslot configuration ───────────────────────────────

export const MIN_TIMESLOT_DURATION_MINUTES = 30
export const MAX_TIMESLOT_DURATION_MINUTES = 8 * 60
export const TIMESLOT_INCREMENT_MINUTES = 30

// ── Email domain rules ───────────────────────────────────

export const STUDENT_DOMAIN = "@itmlyceumalabang.onmicrosoft.com"
export const FACULTY_DOMAIN = "@lyceumalabang.edu.ph"

export const STUDENT_ROLE = "STUDENT"
export const FACULTY_ROLE = "FACULTY"
export const DEAN_ROLE = "DEAN"
export const ADMIN_ROLE = "ADMIN"
export const GUEST_ROLE = "GUEST"

export const ETL_UPLOAD_TYPE_STUDENT = "student"
export const ETL_UPLOAD_TYPE_FACULTY = "faculty"
export const ETL_UPLOAD_TYPE_EVAL_FACULTY = "evaluation-faculty"
export const ETL_UPLOAD_TYPE_EVAL_STUDENT = "evaluation-student"

export type EtlUploadType = "student" | "faculty" | "evaluation-faculty" | "evaluation-student"
