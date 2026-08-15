-- V40: the active Amarok Mk2 Auto Zürich cover is catalogued on Wikimedia
-- Commons as a blue Volkswagen pickup truck. Keep public color filters aligned.
update public.vehicles
set color = 'Mavi', updated_at = now()
where id = '01c95ee1-6e6e-455e-9309-fffbaa1c60ea';
