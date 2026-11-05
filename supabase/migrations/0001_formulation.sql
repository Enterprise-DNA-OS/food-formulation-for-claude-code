create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = clock_timestamp(); return new; end $$;

create table ingredients (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 name text not null check (length(trim(name)) > 0), supplier text not null default '',
 cost_per_kg numeric(14,4) check(cost_per_kg >= 0), currency text not null default 'NZD' check(currency ~ '^[A-Z]{3}$'),
 energy_kj numeric check(energy_kj >= 0), protein_g numeric check(protein_g between 0 and 100),
 fat_g numeric check(fat_g between 0 and 100), saturated_fat_g numeric check(saturated_fat_g between 0 and 100),
 carbohydrate_g numeric check(carbohydrate_g between 0 and 100), sugars_g numeric check(sugars_g between 0 and 100),
 sodium_mg numeric check(sodium_mg between 0 and 100000),
 allergens text[], source text not null default '', spec_review_due date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(saturated_fat_g <= fat_g), check(sugars_g <= carbohydrate_g)
);
comment on column ingredients.allergens is 'Supplier declaration names. NULL = unknown; empty array = explicitly reviewed with none declared. Not cross-contact assessment.';
create table recipes (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 name text not null check(length(trim(name)) > 0), owner text not null default '',
 stage text not null default 'trial' check(stage in ('trial','active','archived')),
 yield_g numeric check(yield_g > 0), serving_g numeric check(serving_g > 0),
 pack_g numeric check(pack_g > 0), currency text not null default 'NZD' check(currency ~ '^[A-Z]{3}$'),
 review_due date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(serving_g <= yield_g)
);
create table recipe_lines (
 id uuid primary key default gen_random_uuid(), recipe_id uuid not null references recipes(id),
 ingredient_id uuid not null references ingredients(id), grams numeric not null check(grams > 0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(recipe_id, ingredient_id)
);
create table reviews (
 id uuid primary key default gen_random_uuid(), recipe_id uuid not null references recipes(id),
 reviewer text not null check(length(trim(reviewer)) > 0), note text not null,
 snapshot jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), recipe_id uuid references recipes(id),
 ingredient_id uuid references ingredients(id), author text not null, body text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((recipe_id is null) <> (ingredient_id is null))
);
create table source_exports (
 id uuid primary key default gen_random_uuid(), recipe_id uuid not null references recipes(id),
 filename text not null, sha256 text not null, raw_text text not null, imported_by text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(recipe_id,sha256)
);
create table audit_events (
 id uuid primary key default gen_random_uuid(), actor text not null, action text not null,
 record_id uuid, details jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['ingredients','recipes','recipe_lines','reviews','notes','source_exports','audit_events'] loop
  execute format('create trigger touch before update on %I for each row execute function touch_updated_at()',t);
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on %I from public',t);
 end loop;
end $$;

create view ingredient_usage as
select i.id, i.code, i.name, i.supplier, i.spec_review_due,
 count(distinct r.id)::int as recipes_using,
 string_agg(distinct r.code, ', ' order by r.code) as recipe_codes
from ingredients i left join recipe_lines l on l.ingredient_id=i.id
left join recipes r on r.id=l.recipe_id and r.stage <> 'archived'
group by i.id;

create view recipe_costs as
select r.id, r.code, r.name, r.stage, r.currency, r.yield_g, r.serving_g,
 count(l.id)::int as ingredient_count, sum(l.grams) as input_g,
 count(l.id) filter(where i.cost_per_kg is null or i.currency <> r.currency)::int as unknown_costs,
 case when count(l.id)>0 and bool_and(i.cost_per_kg is not null and i.currency=r.currency)
 then round(sum(l.grams*i.cost_per_kg/1000),4) end as batch_cost_amount,
 case when count(l.id)>0 and bool_and(i.cost_per_kg is not null and i.currency=r.currency)
 then round(sum(l.grams*i.cost_per_kg/1000)*r.serving_g/r.yield_g,4) end as serving_cost_amount
from recipes r left join recipe_lines l on l.recipe_id=r.id
left join ingredients i on i.id=l.ingredient_id group by r.id;

create view recipe_nutrients as
select r.id, r.code, r.name, n.nutrient, n.unit, count(l.id)::int as ingredients,
 count(l.id) filter(where n.value is null)::int as unknown_values,
 case when count(l.id)>0 and bool_and(n.value is not null)
 then round(sum(l.grams*n.value/100)*100/r.yield_g,3) end as per_100g,
 case when count(l.id)>0 and bool_and(n.value is not null)
 then round(sum(l.grams*n.value/100)*r.serving_g/r.yield_g,3) end as per_serving
from recipes r left join recipe_lines l on l.recipe_id=r.id left join ingredients i on i.id=l.ingredient_id
cross join lateral (values
 ('energy','kJ',i.energy_kj),('protein','g',i.protein_g),('fat','g',i.fat_g),
 ('saturated fat','g',i.saturated_fat_g),('carbohydrate','g',i.carbohydrate_g),
 ('sugars','g',i.sugars_g),('sodium','mg',i.sodium_mg)
) n(nutrient,unit,value)
group by r.id,n.nutrient,n.unit;

create view review_queue as
select r.id,r.code,r.name,r.owner,r.stage,r.review_due,
 (select max(created_at) from reviews where recipe_id=r.id) as last_review,
 greatest(r.updated_at, max(l.updated_at), max(i.updated_at)) as last_change,
 case when (select max(created_at) from reviews where recipe_id=r.id) is null then 'never reviewed'
 when greatest(r.updated_at,max(l.updated_at),max(i.updated_at)) > (select max(created_at) from reviews where recipe_id=r.id) then 'changed since review'
 when r.review_due is null then 'no review date'
 when r.review_due < current_date then 'review overdue' else 'review current' end as review_state
from recipes r left join recipe_lines l on l.recipe_id=r.id left join ingredients i on i.id=l.ingredient_id group by r.id;

create view compliance_findings as
select r.id as recipe_id, r.code, 'NIP-01' as rule, 'Missing yield, serving or pack weight' as problem,
 'https://www.foodstandards.gov.au/consumer/labelling/panels' as source
from recipes r where r.yield_g is null or r.serving_g is null or r.pack_g is null
union all select r.id,r.code,'FORMULA-01','No ingredient quantities recorded','Local completeness check' from recipes r
where not exists(select 1 from recipe_lines where recipe_id=r.id)
union all select n.id,n.code,'NIP-02','Missing nutrient: '||n.nutrient,'https://www.foodstandards.gov.au/consumer/labelling/panels'
from recipe_nutrients n where n.per_100g is null
union all select r.id,r.code,'EVIDENCE-01','Supplier evidence missing or overdue: '||i.code,'Local supplier review policy'
from recipes r join recipe_lines l on l.recipe_id=r.id join ingredients i on i.id=l.ingredient_id
where i.source='' or i.spec_review_due is null or i.spec_review_due < current_date
union all select r.id,r.code,'ALLERGEN-01','Allergen declaration unknown: '||i.code,'https://www.foodstandards.gov.au/business/labelling/allergen-labelling'
from recipes r join recipe_lines l on l.recipe_id=r.id join ingredients i on i.id=l.ingredient_id where i.allergens is null
union all select r.id,r.code,'REVIEW-01',q.review_state,'Local technical review policy'
from recipes r join review_queue q on q.id=r.id where q.review_state <> 'review current';

revoke all on ingredient_usage,recipe_costs,recipe_nutrients,review_queue,compliance_findings from public;
