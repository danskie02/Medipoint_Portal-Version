-- Map legacy degree programs to university colleges for student profiles.
-- The profiles.program column continues to store the academic unit for students;
-- values are now colleges instead of specific degree programs.

update public.profiles
set program = case program
  when 'BS Computer Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Civil Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Electrical Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Electronics Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Mechanical Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Information Technology' then 'COLLEGE OF INFORMATION AND COMPUTING SCIENCES'
  when 'BS Information Systems' then 'COLLEGE OF INFORMATION AND COMPUTING SCIENCES'
  when 'BS Computing Science' then 'COLLEGE OF INFORMATION AND COMPUTING SCIENCES'
  when 'BS Criminology' then 'COLLEGE OF CRIMINAL JUSTICE EDUCATION'
  when 'BS Environmental Science' then 'COLLEGE OF ENVIRONMENTAL STUDIES'
  when 'BS Midwifery' then 'COLLEGE OF ALLIED HEALTH SCIENCES'
  when 'BS Nursing' then 'COLLEGE OF ALLIED HEALTH SCIENCES'
  else program
end
where role = 'student'
  and program in (
    'BS Computer Engineering',
    'BS Civil Engineering',
    'BS Electrical Engineering',
    'BS Electronics Engineering',
    'BS Mechanical Engineering',
    'BS Information Technology',
    'BS Information Systems',
    'BS Computing Science',
    'BS Criminology',
    'BS Environmental Science',
    'BS Midwifery',
    'BS Nursing'
  );

comment on column public.profiles.program is
  'Academic college for students (formerly specific degree program).';

-- Keep historical assessment snapshots aligned with the college mapping.
update public.assessments
set program_snapshot = case program_snapshot
  when 'BS Computer Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Civil Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Electrical Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Electronics Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Mechanical Engineering' then 'COLLEGE OF ENGINEERING'
  when 'BS Information Technology' then 'COLLEGE OF INFORMATION AND COMPUTING SCIENCES'
  when 'BS Information Systems' then 'COLLEGE OF INFORMATION AND COMPUTING SCIENCES'
  when 'BS Computing Science' then 'COLLEGE OF INFORMATION AND COMPUTING SCIENCES'
  when 'BS Criminology' then 'COLLEGE OF CRIMINAL JUSTICE EDUCATION'
  when 'BS Environmental Science' then 'COLLEGE OF ENVIRONMENTAL STUDIES'
  when 'BS Midwifery' then 'COLLEGE OF ALLIED HEALTH SCIENCES'
  when 'BS Nursing' then 'COLLEGE OF ALLIED HEALTH SCIENCES'
  else program_snapshot
end
where program_snapshot in (
  'BS Computer Engineering',
  'BS Civil Engineering',
  'BS Electrical Engineering',
  'BS Electronics Engineering',
  'BS Mechanical Engineering',
  'BS Information Technology',
  'BS Information Systems',
  'BS Computing Science',
  'BS Criminology',
  'BS Environmental Science',
  'BS Midwifery',
  'BS Nursing'
);
