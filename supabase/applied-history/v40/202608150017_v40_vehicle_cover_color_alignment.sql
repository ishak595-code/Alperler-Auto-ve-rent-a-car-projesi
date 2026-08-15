-- V40: keep customer-facing color filters consistent with the actual cover media.
-- Values below were verified against the currently active Wikimedia Commons cover images.

-- Volkswagen Passat B8 cover is a black sedan.
update public.vehicles
set color = 'Siyah', updated_at = now()
where id = 'efdd5ada-f11a-4684-999d-984dd9740ff6';

-- The active Renault Megane IV Sedan cover used by this sale listing is white.
update public.vehicles
set color = 'Beyaz', updated_at = now()
where id = '64460f16-b018-4e86-9448-e4b872352f8d';

-- The active Peugeot 3008 facelift cover is metallic grey.
update public.vehicles
set color = 'Gri', updated_at = now()
where id = 'd9c97b76-0b3d-4ff3-9818-106ed6676161';

-- The active Toyota Hilux 2.4 J 4x4 cover is a white pickup.
update public.vehicles
set color = 'Beyaz', updated_at = now()
where id = 'e46ca951-2aac-4dfc-87ee-ac0da0942fe3';
