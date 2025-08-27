insert into templates (id, name, description, cover_image, theme_defaults_json, is_active) values
('classic','Clásica','Diseño atemporal','https://images.unsplash.com/photo-1529156069898-49953e39b3ac','{"name":"classic"}',true)
on conflict (id) do update set name=excluded.name;

insert into templates (id, name, description, cover_image, theme_defaults_json, is_active) values
('minimal','Minimal','Tipografía limpia','https://images.unsplash.com/photo-1544957993-204fcb74d1a0','{"name":"minimal"}',true)
on conflict (id) do update set name=excluded.name;

insert into templates (id, name, description, cover_image, theme_defaults_json, is_active) values
('rustic','Rústica','Texturas orgánicas','https://images.unsplash.com/photo-1460353581641-37baddab0fa2','{"name":"rustic"}',true)
on conflict (id) do update set name=excluded.name;