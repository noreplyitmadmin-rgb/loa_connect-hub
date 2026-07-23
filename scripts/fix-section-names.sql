-- Fix polluted section names where name contains the program prefix
-- e.g. "BSIT 11M1" or "BSIT-11M1" → "11M1" where program="BSIT"
-- Safe: only strips prefix when program matches the linked department_course

-- Preview what will change (run first to review)
SELECT
  s.id,
  s.name AS old_name,
  CASE
    WHEN s.name LIKE s.program || '-%' THEN TRIM(SUBSTRING(s.name FROM LENGTH(s.program) + 2))
    WHEN s.name LIKE s.program || ' %' THEN TRIM(SUBSTRING(s.name FROM LENGTH(s.program) + 2))
    ELSE s.name
  END AS new_name,
  s.program,
  dc.code AS course_code
FROM sections s
JOIN department_courses dc ON dc.id = s."departmentCourseId"
WHERE (s.name LIKE s.program || '-%' OR s.name LIKE s.program || ' %')
  AND LENGTH(s.name) > LENGTH(s.program) + 1
  AND s.program = dc.code;

-- Apply the fix
UPDATE sections
SET name = TRIM(SUBSTRING(name FROM LENGTH(program) + 2))
FROM department_courses dc
WHERE dc.id = sections."departmentCourseId"
  AND (name LIKE program || '-%' OR name LIKE program || ' %')
  AND LENGTH(name) > LENGTH(program) + 1
  AND program = dc.code;
