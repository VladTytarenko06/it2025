Завдання на практичну роботу

Терміни (EN + IPA + UA):

- **logging** /ˈlɔːɡɪŋ/ — журналювання (логування)
- **audit log** /ˈɔːdɪt lɔːɡ/ — журнал аудиту
- **trigger** /ˈtrɪɡər/ — тригер
- **procedure** /prəˈsiːdʒər/ — процедура
- **function** /ˈfʌŋkʃən/ — функція

---

## 0) Підготовка: що саме логувати

**Завдання (коротко):** визначити мінімальний склад полів для журналу аудиту.

**Вимоги до таблиці логів `oiaz.audit_log`:**

- `log_id` (PK)
- `event_ts` (час події, `timestamptz`, за замовчуванням `now()`)
- `db_user` (хто виконав дію: `current_user`)
- `client_addr` (IP клієнта: `inet_client_addr()`; може бути NULL)
- `action` (тип дії: INSERT / UPDATE / DELETE)
- `table_name` (на якій таблиці подія)
- `row_pk` (ідентифікатор рядка: наприклад `report_id` або `item_id`)
- `details` (короткий опис змін: text або jsonb)

**Критерій:** таблиця створена і не ламає основну БД.

---

## 1) Функція: отримати “коротку картку” звіту

**Мета:** навчитися писати функцію для аналітики/виводу.

**Завдання:** створити `function` `oiaz.fn_report_brief(p_report_id bigint) returns text`, яка повертає 1 рядок:

- `unit_code`, `report_date`, `direction`, `report_type`, `severity`
- - кількість метрик у `report_item`
- - (опційно) перші 80 символів `summary`

**Вимоги:**

- якщо `report_id` не існує — повертати зрозуміле повідомлення або `NULL` (ви обираєте, але однаково у всіх групах)
- не робити “важких” циклів: достатньо 1 SELECT з JOIN та агрегацією

**Перевірка:** `SELECT oiaz.fn_report_brief(<id>);`

---

## 2) Процедура: “прийняти звіт від підрозділу” одним викликом

**Мета:** показати, що процедура /prəˈsiːdʒər/ може “оркеструвати” кілька вставок.

**Завдання:** створити `procedure` `oiaz.sp_submit_report(...)`, яка:

1. вставляє запис у `oiaz.report` (заповнює `report_date`, `report_dt`, `unit_id`, `direction`, `report_type`, `summary`, `severity`=0 або NULL->0)
2. вставляє набір метрик у `oiaz.report_item`

**Простий формат вхідних метрик (для початківців):**

- або `jsonb` масив: `[{"metric":"...", "value":123}, ...]`
- або два масиви `text[]` і `int[]` однакової довжини
  (оберіть один варіант як “базовий” для групи)

**Валідація в процедурі (мінімум):**

- `unit_id` має існувати
- `direction` не порожній
- метрики не дублюються в межах одного звіту (можна перевірити простим способом)

**Перевірка:** після `CALL` у `report` з’явився 1 рядок, у `report_item` — N рядків, прив’язаних до нового `report_id`.

---

## 3) Тригер для логування: журнал подій по `report` і `report_item`

**Мета:** навчитися робити тригер /ˈtrɪɡər/ для аудиту.

### 3.1. Тригер на `oiaz.report`

**Завдання:** створити `trigger function` `oiaz.tg_audit_report()` і тригер:

- спрацьовує на `INSERT OR UPDATE OR DELETE` таблиці `oiaz.report`
- пише рядок у `oiaz.audit_log`

**Що писати у `details`:**

- для INSERT: ключові поля (`unit_id`, `direction`, `report_type`, `severity`)
- для UPDATE: тільки те, що змінилось (мінімум: `severity`, `summary`, `direction`, `report_type`)
- для DELETE: достатньо `report_id` + `unit_id`

**Підказка (без коду):**

- використовуйте `TG_OP`, `TG_TABLE_NAME`, `NEW`, `OLD`
- row_pk: для report це `report_id`

### 3.2. Тригер на `oiaz.report_item`

**Завдання:** аналогічно створити `oiaz.tg_audit_report_item()`:

- логувати INSERT/UPDATE/DELETE по метриках
- row_pk: `item_id`
- у `details` — `report_id`, `metric`, `value` (і старе значення при UPDATE)

**Перевірка:**

- зробити 1 INSERT звіту (через процедуру) → у логах має бути мінімум:
  - запис по `report`
  - кілька записів по `report_item`

- зробити UPDATE `severity` або `summary` → 1 лог із `action='UPDATE'`
- зробити DELETE одного `report_item` → 1 лог із `action='DELETE'`

---

## 4) Міні-умова “для реалістичності” (дуже проста)

**Завдання:** заборонити зміну `unit_id` у вже створеному `report`.

**Реалізація:** ще один `BEFORE UPDATE` тригер на `oiaz.report`, який:

- якщо `OLD.unit_id <> NEW.unit_id` → підняти помилку `RAISE EXCEPTION`

**Навіщо:** щоб показати різницю між:

- тригером “контроль правил” (BEFORE)
- тригером “аудит” (AFTER)

---

## Контрольні питання для групи (на 5 хв)

1. Чим **function** /ˈfʌŋkʃən/ зручна для SELECT, а **procedure** /prəˈsiːdʒər/ — для “операцій”?
2. Чому аудит краще робити **AFTER**, а контроль правил — **BEFORE**?
3. Які дані про користувача ви можете отримати без додаткових таблиць? (`current_user`, IP, application_name)
