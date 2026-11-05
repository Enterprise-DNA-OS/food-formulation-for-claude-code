do $$ begin
if exists(select 1 from recipes where code='DEMO-GRANOLA') then return; end if;
insert into ingredients(code,name,supplier,cost_per_kg,energy_kj,protein_g,fat_g,saturated_fat_g,carbohydrate_g,sugars_g,sodium_mg,allergens,source,spec_review_due) values
('OATS','Rolled oats','Demo Grain Co',3.20,1600,13,7,1.2,60,1,5,array['oats','gluten'],'Fictional supplier sheet O-01',current_date+120),
('HONEY','Clover honey','Demo Pantry Co',12,1350,0.3,0,0,82,82,8,array[]::text[],'Fictional supplier sheet H-01',current_date-15),
('ALMOND','Almond pieces','Demo Nut Co',18,2500,21,52,4,7,4,2,array['almond'],'Fictional supplier sheet A-01',current_date+200),
('MILK','Milk powder','Demo Dairy Co',9,2100,26,27,17,38,38,400,array['milk'],'Fictional supplier sheet M-01',current_date+200),
('COCOA','Cocoa blend','Demo Pantry Co',14,null,20,14,8,12,2,null,null,'',null),
('SALT','Fine salt','Demo Pantry Co',1,0,0,0,0,0,0,39000,array[]::text[],'Fictional supplier sheet S-01',current_date+300),
('OIL','Sunflower oil','Demo Pantry Co',5,3700,0,100,10,0,0,0,array[]::text[],'Fictional supplier sheet F-01',current_date+300);
insert into recipes(code,name,owner,stage,yield_g,serving_g,pack_g,review_due,created_at) values
('DEMO-GRANOLA','Almond breakfast granola','Mara','active',900,45,450,current_date-4,now()-interval '60 days'),
('DEMO-COCOA','Cocoa breakfast granola','Hana','trial',950,50,500,current_date+30,now()-interval '40 days'),
('DEMO-BAR','Almond snack bar','Mara','trial',1000,40,200,current_date+30,now()-interval '45 days'),
('DEMO-EMPTY','Cocoa oat trial','Hana','trial',null,null,null,null,now()-interval '31 days');
insert into recipe_lines(recipe_id,ingredient_id,grams)
select r.id,i.id,v.grams from (values
('DEMO-GRANOLA','OATS',600),('DEMO-GRANOLA','HONEY',200),('DEMO-GRANOLA','ALMOND',150),('DEMO-GRANOLA','OIL',50),
('DEMO-COCOA','OATS',550),('DEMO-COCOA','HONEY',200),('DEMO-COCOA','COCOA',150),('DEMO-COCOA','MILK',100),
('DEMO-BAR','OATS',500),('DEMO-BAR','ALMOND',300),('DEMO-BAR','HONEY',190),('DEMO-BAR','SALT',10)
)v(recipe,ingredient,grams) join recipes r on r.code=v.recipe join ingredients i on i.code=v.ingredient;
insert into notes(recipe_id,author,body,created_at) select id,'Demo technologist','Bench trial prepared; supplier documents need review.',now()-interval '25 days' from recipes where stage='trial';
insert into reviews(recipe_id,reviewer,note,snapshot,created_at) select id,'Demo reviewer','Historical fictional review; changes require a fresh review.','{}',now()-interval '20 days' from recipes where code='DEMO-GRANOLA';
end $$;
