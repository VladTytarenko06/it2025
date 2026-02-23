-- =========================================
-- FUNCTION: calc severity by report_id
-- =========================================
DROP FUNCTION IF EXISTS oiaz_train.fn_calc_severity (BIGINT);

CREATE FUNCTION oiaz_train.fn_calc_severity(p_report_id BIGINT)
RETURNS SMALLINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_engagements INT := 0;
  v_enemy_eq    INT := 0;
  v_enemy_pers  INT := 0;
  v_raw         NUMERIC;
  v_out         INT;
BEGIN
  SELECT COALESCE(MAX(CASE WHEN metric='engagements_cnt' THEN value END), 0),
         COALESCE(MAX(CASE WHEN metric='enemy_losses_equipment' THEN value END), 0),
         COALESCE(MAX(CASE WHEN metric='enemy_losses_personnel' THEN value END), 0)
    INTO v_engagements, v_enemy_eq, v_enemy_pers
  FROM oiaz_train.report_item
  WHERE report_id = p_report_id;

  v_raw := 0.5 * v_engagements
        + 2.0 * v_enemy_eq
        + 0.02 * v_enemy_pers;

  v_out := ROUND(v_raw);

  IF v_out < 0 THEN v_out := 0; END IF;
  IF v_out > 100 THEN v_out := 100; END IF;

  RETURN v_out::SMALLINT;
END;
$$;

-- =========================================
-- PROCEDURE: add report + items atomically
-- Accepts items as JSONB array:
--   [{"metric":"engagements_cnt","value":12}, ...]
-- =========================================
DROP PROCEDURE IF EXISTS oiaz_train.sp_add_report_with_items (
    DATE,
    BIGINT,
    TEXT,
    SMALLINT,
    JSONB,
    BIGINT
);

CREATE PROCEDURE oiaz_train.sp_add_report_with_items(
  IN  p_report_date DATE,
  IN  p_unit_id     BIGINT,
  IN  p_report_type TEXT,
  IN  p_severity    SMALLINT,
  IN  p_items       JSONB,
  OUT p_report_id   BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_exists INT;
  v_item   JSONB;
  v_metric TEXT;
  v_value  INT;
BEGIN
  SELECT 1 INTO v_exists FROM oiaz_train.unit WHERE unit_id = p_unit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unit_id % not found in oiaz_train.unit', p_unit_id;
  END IF;

  INSERT INTO oiaz_train.report(report_date, unit_id, report_type, severity)
  VALUES (p_report_date, p_unit_id, p_report_type, COALESCE(p_severity, 0))
  RETURNING report_id INTO p_report_id;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_metric := NULLIF(TRIM(v_item->>'metric'), '');
    v_value  := (v_item->>'value')::INT;

    INSERT INTO oiaz_train.report_item(report_id, metric, value)
    VALUES (p_report_id, v_metric, v_value);
  END LOOP;
END;
$$;

-- =========================================
-- TRIGGER 1: validate report_item against metric_dict
-- BEFORE INSERT/UPDATE
-- =========================================
DROP FUNCTION IF EXISTS oiaz_train.tg_validate_report_item ();

CREATE FUNCTION oiaz_train.tg_validate_report_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_min INT;
  v_max INT;
BEGIN
  IF NEW.metric IS NULL OR btrim(NEW.metric) = '' THEN
    RAISE EXCEPTION 'metric must be non-empty';
  END IF;

  SELECT min_value, max_value
    INTO v_min, v_max
  FROM oiaz_train.metric_dict
  WHERE metric = NEW.metric;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown metric: %', NEW.metric;
  END IF;

  IF NEW.value IS NULL THEN
    RAISE EXCEPTION 'value must be non-null for metric %', NEW.metric;
  END IF;

  IF NEW.value < v_min OR NEW.value > v_max THEN
    RAISE EXCEPTION 'value % out of range [%..%] for metric %',
      NEW.value, v_min, v_max, NEW.metric;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_report_item ON oiaz_train.report_item;

CREATE TRIGGER trg_validate_report_item
BEFORE INSERT OR UPDATE ON oiaz_train.report_item
FOR EACH ROW
EXECUTE FUNCTION oiaz_train.tg_validate_report_item();

-- =========================================
-- TRIGGER 2: recalc report.severity after any report_item change
-- AFTER INSERT/UPDATE/DELETE
-- =========================================
DROP FUNCTION IF EXISTS oiaz_train.tg_recalc_report_severity ();

CREATE FUNCTION oiaz_train.tg_recalc_report_severity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_report_id BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_report_id := OLD.report_id;
  ELSE
    v_report_id := NEW.report_id;
  END IF;

  UPDATE oiaz_train.report
  SET severity = oiaz_train.fn_calc_severity(v_report_id)
  WHERE report_id = v_report_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_report_severity ON oiaz_train.report_item;

CREATE TRIGGER trg_recalc_report_severity
AFTER INSERT OR UPDATE OR DELETE ON oiaz_train.report_item
FOR EACH ROW
EXECUTE FUNCTION oiaz_train.tg_recalc_report_severity();

-- =========================================
-- DEMO DATA (units + sample reports)
-- =========================================
INSERT INTO
    oiaz_train.unit (unit_code, unit_name)
VALUES ('A101', '1-й підрозділ'),
    ('B202', '2-й підрозділ'),
    ('C303', '3-й підрозділ')
ON CONFLICT (unit_code) DO NOTHING;

-- Example: add report with items via procedure
-- CALL oiaz_train.sp_add_report_with_items(
--   CURRENT_DATE,
--   (SELECT unit_id FROM oiaz_train.unit WHERE unit_code='A101'),
--   'SITREP',
--   0,
--   '[{"metric":"engagements_cnt","value":12},
--     {"metric":"enemy_losses_equipment","value":7},
--     {"metric":"enemy_losses_personnel","value":120}]'::jsonb,
--   NULL
-- );

-- Example validation failure (should error):
-- INSERT INTO oiaz_train.report_item(report_id, metric, value)
-- VALUES (1, 'unknown_metric', 5);

-- =========================================
-- QUERIES FOR CHECKING
-- =========================================
-- 1) Report summary with calculated severity
-- SELECT r.report_id, u.unit_code, r.report_date, r.report_type,
--        r.severity AS severity_db,
--        oiaz_train.fn_calc_severity(r.report_id) AS severity_calc,
--        (r.severity - oiaz_train.fn_calc_severity(r.report_id)) AS delta
-- FROM oiaz_train.report r
-- JOIN oiaz_train.unit u ON u.unit_id = r.unit_id
-- ORDER BY r.report_date DESC, u.unit_code;

-- 2) Items for last reports
-- SELECT r.report_id, u.unit_code, r.report_date, ri.metric, ri.value
-- FROM oiaz_train.report r
-- JOIN oiaz_train.unit u ON u.unit_id = r.unit_id
-- JOIN oiaz_train.report_item ri ON ri.report_id = r.report_id
-- ORDER BY r.report_date DESC, r.report_id DESC, ri.metric;

-- =========================================
-- TRANSACTION DEMO (manual):
-- BEGIN;
--   INSERT INTO oiaz_train.report(report_date, unit_id, report_type)
--   VALUES (CURRENT_DATE, (SELECT unit_id FROM oiaz_train.unit WHERE unit_code='B202'), 'SITREP')
--   RETURNING report_id;
--   SAVEPOINT sp1;
--   INSERT INTO oiaz_train.report_item(report_id, metric, value) VALUES (<rid>, 'engagements_cnt', 10);
--   INSERT INTO oiaz_train.report_item(report_id, metric, value) VALUES (<rid>, 'enemy_losses_equipment', -1); -- fails
--   ROLLBACK TO SAVEPOINT sp1;
--   INSERT INTO oiaz_train.report_item(report_id, metric, value) VALUES (<rid>, 'enemy_losses_equipment', 3);
-- COMMIT;
-- =========================================
```