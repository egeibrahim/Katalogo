-- Rename attribute display name from "Decoration Method" to "Technique"
UPDATE public.attributes
SET name = 'Technique', updated_at = now()
WHERE key = 'decoration_method' AND name IS DISTINCT FROM 'Technique';
