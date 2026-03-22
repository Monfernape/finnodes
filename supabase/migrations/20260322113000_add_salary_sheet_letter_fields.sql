alter table public.salary_sheets
add column if not exists recipient_name text not null default 'The Payroll Manager,',
add column if not exists recipient_bank text not null default 'Bank Alfalah Multan.',
add column if not exists salutation text not null default 'Dear Sir,',
add column if not exists letter_body text not null default 'We confirm that the attached provided list is permanent staff of our company. Please facilitate opening salary accounts and offer Payroll Facilities in your bank.';
