Ключові терміни (EN + IPA + UA):

- **stored procedure** /stɔːrd prəˈsiːdʒər/ — збережена процедура
- **function** /ˈfʌŋkʃən/ — функція
- **trigger** /ˈtrɪɡər/ — тригер
- **transaction** /trænˈzækʃən/ — транзакція
- **isolation level** /ˌaɪsəˈleɪʃən ˈlevəl/ — рівень ізоляції
- **rollback** /ˈroʊlbæk/ — відкат
- **savepoint** /ˈseɪvpɔɪnt/ — точка збереження

---

## Кейс 1. “Швидкий інжест звіту”: процедура, що створює report + items

**Мета:** показати різницю **procedure** /prəˈsiːdʒər/ (викликається `CALL`, може керувати транзакційною логікою всередині) та зручність інкапсуляції вставок.

**Ситуація:** підрозділ подав звіт типу `SITREP` із набором метрик (наприклад: `enemy_personnel_losses`, `enemy_equipment_losses`, `engagements_cnt`).

**Завдання групам:**

1. Створити `procedure` `oiaz_train.sp_add_report_with_items(...)`, яка:
   - вставляє рядок у `report` (дата, unit_id, report_type, severity),
   - вставляє N рядків у `report_item` (metric, value),
   - повертає `report_id` через OUT-параметр або через `RETURNING`.

2. Додати перевірку: якщо `unit_id` не існує — підняти помилку `RAISE EXCEPTION`.

**Перевірка результату:**

- після `CALL` у `report` має з’явитися 1 рядок, у `report_item` — відповідна кількість рядків з правильним `report_id`.

---

## Кейс 2. “Оцінка загрози”: функція, що рахує інтегральний severity

**Мета:** навчити створювати **function** /ˈfʌŋkʃən/ для аналітики та використання у SELECT.

**Ситуація:** severity має бути не “зі слів”, а з формули по метриках:

- приклад: `severity = round( 0.5*engagements + 2.0*enemy_losses_equipment + 0.02*enemy_losses_personnel )`, але обмежити 0..100.

**Завдання:**

1. Створити `function` `oiaz_train.fn_calc_severity(p_report_id bigint) returns smallint`, яка:
   - читає `report_item` для звіту,
   - дістає потрібні метрики (якщо нема — вважати 0),
   - обчислює severity,
   - повертає `smallint` у межах 0..100.

2. Зробити запит-звіт:
   - `report_id, unit_code, report_date, severity_db, severity_calc, delta`.

**Плюс для сильніших:** додати `IMMUTABLE/STABLE/VOLATILE` обґрунтовано (ця функція читає таблиці → зазвичай `STABLE`).

---

## Кейс 3. “Якість даних”: тригер валідації report_item (BEFORE INSERT/UPDATE)

**Мета:** показати **trigger** /ˈtrɪɡər/ як механізм “захисту від сміття” у даних.

**Правила якості:**

- `metric` лише з дозволеного набору (наприклад, 8–12 метрик, які ви узгодили на занятті),
- `value` не може бути від’ємним,
- для окремих метрик — верхні межі (наприклад, `engagements_cnt <= 500`).

**Завдання:**

1. Створити довідник метрик (як варіант: таблиця `oiaz_train.metric_dict(metric text primary key, min_value int, max_value int)`).
2. Написати `trigger function` `oiaz_train.tg_validate_report_item()`:
   - перевіряє, що `NEW.metric` є в `metric_dict`,
   - перевіряє межі `NEW.value`,
   - інакше `RAISE EXCEPTION` з інформативним текстом.

3. Поставити тригер `BEFORE INSERT OR UPDATE` на `report_item`.

**Перевірка:**

- спроба вставити невідому метрику або `value < 0` має падати.

---

## Кейс 4. “Авто-оновлення severity”: тригер агрегування (AFTER INSERT/UPDATE/DELETE)

**Мета:** зв’язати кейс 2 + тригери: при зміні метрик — автоматично перерахувати `report.severity`.

**Завдання:**

1. Використати `fn_calc_severity(report_id)` з кейсу 2.
2. Створити `trigger function` `oiaz_train.tg_recalc_report_severity()`:
   - визначає `report_id` (для INSERT/UPDATE беріть `NEW.report_id`, для DELETE — `OLD.report_id`),
   - оновлює `oiaz_train.report.severity`.

3. Поставити `AFTER INSERT OR UPDATE OR DELETE` на `report_item`.

**Перевірка:**

- змініть `value` по ключовій метриці → `report.severity` має змінитись автоматично.

---

## Кейс 5. “Транзакція під час прийому звіту”: атомарність + SAVEPOINT

**Мета:** відпрацювати **transaction** /trænˈzækʃən/, **rollback** /ˈroʊlbæk/, **savepoint** /ˈseɪvpɔɪnt/.

**Ситуація:** оператор заносить звіт вручну, але в середині виявляє помилку в 1 метриці.

**Завдання:**

1. Виконати вставку `report`, потім `SAVEPOINT sp1`, далі — серію вставок у `report_item`.
2. Одна з вставок має бути навмисно “погана” (щоб спрацював тригер валідації з кейсу 3).
3. Після помилки:
   - зробити `ROLLBACK TO SAVEPOINT sp1`,
   - виправити значення,
   - продовжити вставки,
   - завершити `COMMIT`.

**Критерій успіху:**

- у БД має бути 1 звіт і лише коректні `report_item`, без “часткових” вставок.

---

## Кейс 6. “Конкурентний доступ”: рівні ізоляції + фантоми/неповторювані читання

**Мета:** відчути на практиці **isolation level** /ˌaɪsəˈleɪʃən ˈlevəl/ та типові аномалії.

**Формат:** 2 підгрупи = 2 сесії в pgAdmin/psql.

**Сценарій:**

- Сесія A рахує зведення по днях (кількість звітів, середній severity).
- Сесія B паралельно додає/редагує звіт.

**Завдання:**

1. Повторити експеримент у `READ COMMITTED`, потім у `REPEATABLE READ`, потім (за бажання) у `SERIALIZABLE`.
2. Зафіксувати різницю:
   - чи змінюється результат одного й того ж SELECT у межах транзакції,
   - чи з’являються “нові” рядки (phantom reads /ˈfæntəm riːdz/).

**Артефакт групи:** короткий висновок: який режим підходить для “знімка обстановки на 08:00”, а який — для оперативного дашборда.
