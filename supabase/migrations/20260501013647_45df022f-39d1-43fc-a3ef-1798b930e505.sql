
CREATE OR REPLACE FUNCTION public.seed_default_closing_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
BEGIN
  -- Skip the platform tenant
  IF NEW.id = '00000000-0000-0000-0000-000000000001'::uuid THEN
    RETURN NEW;
  END IF;

  -- Skip if a template with this title already exists for the tenant
  IF EXISTS (
    SELECT 1 FROM public.checklist_templates
    WHERE tenant_id = NEW.id
      AND title = 'Daily Childcare Classroom Closing Checklist'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.checklist_templates (tenant_id, title, description, is_active, created_by)
  VALUES (
    NEW.id,
    'Daily Childcare Classroom Closing Checklist',
    'End-of-day closing checklist covering safety, sanitation, documentation, and security.',
    true,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  )
  RETURNING id INTO v_template_id;

  INSERT INTO public.checklist_items (tenant_id, template_id, section, label, order_index)
  SELECT NEW.id, v_template_id, section, label, ord FROM (VALUES
    ('Child Safety & Accountability','Final headcount completed and verified against attendance sheet',1),
    ('Child Safety & Accountability','All children signed out properly',2),
    ('Child Safety & Accountability','Classroom visually checked to ensure no child remains (bathroom, quiet corners, nap areas, playground transition areas)',3),
    ('Child Safety & Accountability','Incident reports completed and communicated to leadership if needed',4),
    ('Classroom Cleaning & Sanitation','Tables cleaned and disinfected',5),
    ('Classroom Cleaning & Sanitation','High-touch surfaces sanitized (door handles, light switches, cubbies, chairs)',6),
    ('Classroom Cleaning & Sanitation','Toys used during day cleaned or placed in sanitation bin',7),
    ('Classroom Cleaning & Sanitation','Dramatic play items wiped down as needed',8),
    ('Classroom Cleaning & Sanitation','Floors swept or vacuumed',9),
    ('Classroom Cleaning & Sanitation','Spills cleaned immediately',10),
    ('Classroom Cleaning & Sanitation','Daily sanitation log updated (if required by licensing)',11),
    ('Restroom & Diapering Area','Diapering area disinfected',12),
    ('Restroom & Diapering Area','Changing pad sanitized',13),
    ('Restroom & Diapering Area','Trash emptied and liner replaced',14),
    ('Restroom & Diapering Area','Toilets flushed and surfaces wiped',15),
    ('Restroom & Diapering Area','Soap and paper towel levels checked and restocked',16),
    ('Food Service / Snack Area','Food stored properly or discarded per policy',17),
    ('Food Service / Snack Area','Tables and food prep surfaces sanitized',18),
    ('Food Service / Snack Area','Refrigerator checked for expired items',19),
    ('Food Service / Snack Area','Cups/bottles returned to correct child cubbies or sent home',20),
    ('Materials & Room Reset','Learning centers reset for next day',21),
    ('Materials & Room Reset','Materials organized and returned to labeled areas',22),
    ('Materials & Room Reset','Art supplies secured',23),
    ('Materials & Room Reset','Lesson materials prepped if required',24),
    ('Personal Items','Child belongings packed and sent home',25),
    ('Personal Items','Blankets/sheets stored per health guidelines',26),
    ('Personal Items','Lost items placed in designated area',27),
    ('Documentation & Admin Tasks','Daily reports completed (meals, naps, activities, diapering)',28),
    ('Documentation & Admin Tasks','Parent communication sent if required',29),
    ('Documentation & Admin Tasks','Medication logs completed (if applicable)',30),
    ('Documentation & Admin Tasks','Attendance finalized in system',31),
    ('Health & Safety Check','Electrical outlets safe and covered',32),
    ('Health & Safety Check','Cleaning supplies locked away',33),
    ('Health & Safety Check','Windows closed/locked',34),
    ('Health & Safety Check','Classroom hazards removed',35),
    ('Lights, HVAC & Security','Lights turned off (except required security lighting)',36),
    ('Lights, HVAC & Security','Electronics powered down',37),
    ('Lights, HVAC & Security','Doors locked',38),
    ('Lights, HVAC & Security','Alarm system activated (if classroom responsible)',39)
  ) AS t(section, label, ord);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_default_closing_checklist_trigger ON public.tenants;
CREATE TRIGGER seed_default_closing_checklist_trigger
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_closing_checklist();
