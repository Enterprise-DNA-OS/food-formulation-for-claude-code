#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';

const nutrients = ['energy_kj','protein_g','fat_g','saturated_fat_g','carbohydrate_g','sugars_g','sodium_mg'];
const ingredientFields = ['name','supplier','cost_per_kg','currency',...nutrients,'allergens','source','spec_review_due'];
const recipeFields = ['name','owner','stage','yield_g','serving_g','pack_g','currency','review_due'];
const tables = ['ingredients','recipes','recipe_lines','reviews','notes','source_exports','audit_events'];
export const commandFlags = {
 help:[], ingredients:[], recipes:[], recipe:[], costs:[], nutrition:[], allergens:[],
 'spec-renewals':[], 'where-used':[], changes:[], attention:[], compliance:[], insights:[],
 scale:['grams'], compare:[],
 'add-ingredient':['code',...ingredientFields,'by'], 'set-ingredient':[...ingredientFields,'by'],
 'add-recipe':['code',...recipeFields,'by'], 'set-recipe':[...recipeFields,'by'],
 'set-line':['ingredient','grams','by'], log:['ingredient','text','by'], review:['by','note'],
 import:['recipe','by','dry-run','kind','map'], export:['out'],
 'weekly-review':[], 'draft-spec-request':[]
};
export const commands = Object.keys(commandFlags);
export function parse(args) {
 const flags={},pos=[];
 for(const a of args) {
  if(!a.startsWith('--')) {pos.push(a);continue;}
  const eq=a.indexOf('='); const k=a.slice(2,eq<0?undefined:eq);
  if(Object.hasOwn(flags,k)) throw Error(`Duplicate flag --${k}`);
  flags[k]=eq<0?true:a.slice(eq+1);
 }
 const cmd=pos.shift() || 'help';
 if(!commands.includes(cmd)) throw Error(`Unknown command ${cmd}`);
 for(const k of Object.keys(flags)) if(k!=='json'&&!commandFlags[cmd].includes(k)) throw Error(`Unknown flag --${k} for ${cmd}`);
 for(const k of Object.keys(flags)) if(['json','dry-run','ingredient'].includes(k) && !(k==='ingredient' && cmd==='set-line')) {
  if(flags[k]!==true) throw Error(`--${k} takes no value`);
 } else if(flags[k]===true) throw Error(`--${k} needs a value`);
 return {cmd,pos,flags};
}
function required(v,label) {if(typeof v!=='string'||!v.trim()) throw Error(`${label} is required`);return v.trim();}
function number(v,label) {if(v===''||v===true||v===null||!Number.isFinite(Number(v))||Number(v)<0) throw Error(`Invalid ${label}`);return Number(v);}
function date(v) {if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v).toISOString().slice(0,10)!==v) throw Error('Invalid date'); return v;}
function values(flags,allowed) {
 const out={};
 for(const key of allowed) if(Object.hasOwn(flags,key)) {
  const v=flags[key];
  if(key==='allergens') {
   out[key]=v==='unknown'?null:v==='none'?[]:required(v,key).split('|').map(s=>s.trim().toLowerCase());
   if(out[key]?.some(s=>!s))throw Error('Allergen names cannot be blank');continue;
  }
  if(nutrients.includes(key)||['cost_per_kg','yield_g','serving_g','pack_g'].includes(key)) out[key]=v==='unknown'?null:number(v,key);
  else if(key.endsWith('_due')) out[key]=v==='unknown'?null:date(v);
  else out[key]=required(v,key);
 }
 return out;
}
export async function resolve(db,table,term) {
 if(!['ingredients','recipes'].includes(table)) throw Error('Invalid record type');
 required(term,'Record');
 const exact=await db.query(`select * from ${table} where lower(code)=lower($1) or lower(name)=lower($1) or id::text=$1 order by code`,[term]);
 const rows=exact.length?exact:await db.query(`select * from ${table} where starts_with(id::text,lower($1)) or strpos(lower(name),lower($1))>0 order by code`,[term]);
 if(rows.length!==1) throw Error(rows.length?`Ambiguous record. Choose a code:\n${rows.map(r=>`${r.code} | ${r.name} | ${r.id}`).join('\n')}`:`No ${table} match ${term}`);
 return rows[0];
}
async function audit(db,actor,action,id,details) {
 await db.query('insert into audit_events(actor,action,record_id,details) values($1,$2,$3,$4)',[actor,action,id,JSON.stringify(details)]);
}
async function transaction(db,fn,dry=false) {
 await db.exec('begin isolation level serializable');
 try {const out=await fn();await db.exec(dry?'rollback':'commit');return out;}
 catch(e) {await db.exec('rollback');throw e;}
}
async function snapshot(db,r) {
 return {recipe:r,lines:await db.query('select l.grams,i.* from recipe_lines l join ingredients i on i.id=l.ingredient_id where l.recipe_id=$1 order by i.code',[r.id])};
}
const csv=(rows)=>{
 if(!rows.length)return '';
 const keys=Object.keys(rows[0]);const cell=v=>'"'+String(v===null?'':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';
 return [keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n')+'\r\n';
};
function outputRoot(){return process.env.OUTPUT_DIR?path.resolve(process.env.OUTPUT_DIR):REPO_ROOT;}
function writeDraft(title,body) {
 const dir=path.join(outputRoot(),'drafts');fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,`${title}-${randomUUID()}.md`);fs.writeFileSync(file,body,{mode:0o600});return {file,status:'draft only'};
}
export const questions = [
 ['blockers','Which recipes have the most missing evidence?',`select code,count(*)::int as findings from compliance_findings group by code order by findings desc,code`],
 ['shared-specs','Which overdue supplier sheets affect several recipes?',`select code,name,recipe_codes,recipes_using from ingredient_usage where spec_review_due<current_date and recipes_using>0 order by recipes_using desc,code`],
 ['cost-per-serve','Which servings cost the most to make?',`select code,currency,serving_cost_amount,unknown_costs from recipe_costs order by serving_cost_amount desc nulls last,code`],
 ['sugar-drivers','Which ingredients contribute most of each recipe’s sugar?',`select r.code,i.code as ingredient,round(l.grams*i.sugars_g/100,3) as batch_sugars_g from recipe_lines l join ingredients i on i.id=l.ingredient_id join recipes r on r.id=l.recipe_id order by r.code,batch_sugars_g desc nulls last`],
 ['sodium-drivers','Where is each recipe’s sodium coming from?',`select r.code,i.code as ingredient,round(l.grams*i.sodium_mg/100,3) as batch_sodium_mg from recipe_lines l join ingredients i on i.id=l.ingredient_id join recipes r on r.id=l.recipe_id order by r.code,batch_sodium_mg desc nulls last`],
 ['yield-loss','Which recipes lose the most weight during processing?',`select code,input_g,yield_g,round(100*(input_g-yield_g)/nullif(input_g,0),2) as weight_loss_percent from recipe_costs order by weight_loss_percent desc nulls last,code`],
 ['allergen-impact','Which recipes depend on each declared allergen?',`select a.allergen,string_agg(distinct r.code,', ' order by r.code) as recipes from recipes r join recipe_lines l on l.recipe_id=r.id join ingredients i on i.id=l.ingredient_id cross join lateral unnest(i.allergens) a(allergen) group by a.allergen order by a.allergen`],
 ['review-changes','Which recipes changed after their last technical review?',`select code,owner,review_state from review_queue where review_state='changed since review' order by code`],
 ['import-coverage','Which recipes have a retained Genesis export?',`select r.code,count(s.id)::int as source_exports from recipes r left join source_exports s on s.recipe_id=r.id group by r.id order by r.code`],
 ['quiet-trials','Which trials have no recent progress note?',`select r.code,r.owner,max(n.created_at)::date as last_note from recipes r left join notes n on n.recipe_id=r.id where r.stage='trial' group by r.id having coalesce(max(n.created_at),r.created_at)<now()-interval '14 days' order by r.code`]
];
export async function run(db,args) {
 const {cmd,pos,flags:f}=parse(args);
 const one=()=>{if(pos.length!==1)throw Error(`${cmd} needs one record`);return pos[0];};
 const noArgs=()=>{if(pos.length)throw Error(`${cmd} takes no positional arguments`);};
 if(cmd==='help') return commands.map(command=>({command,flags:commandFlags[command].join(', ')}));
 const reads={
  ingredients:'select code,name,supplier,cost_per_kg,currency,spec_review_due from ingredients order by code',
  recipes:'select code,name,owner,stage,yield_g,serving_g from recipes order by code',
  costs:'select code,currency,input_g,yield_g,batch_cost_amount,serving_cost_amount,unknown_costs from recipe_costs order by code',
  'spec-renewals':`select code,name,supplier,spec_review_due,recipe_codes from ingredient_usage where spec_review_due is null or spec_review_due<=current_date+30 order by spec_review_due nulls first,code`,
  changes:'select code,owner,review_state from review_queue order by code',
  attention:'select code,rule,problem from compliance_findings order by code,rule,problem',
  compliance:'select code,rule,problem,source from compliance_findings order by code,rule,problem'
 };
 if(reads[cmd]) {noArgs();return db.query(reads[cmd]);}
 if(['recipe','nutrition','allergens','scale'].includes(cmd)) {
  const r=await resolve(db,'recipes',one());
  if(cmd==='recipe') return {...await snapshot(db,r),notes:await db.query('select author,body,created_at from notes where recipe_id=$1 order by created_at desc',[r.id]),exports:await db.query('select filename,sha256,created_at from source_exports where recipe_id=$1',[r.id])};
  if(cmd==='nutrition')return db.query('select nutrient,unit,per_100g,per_serving,unknown_values from recipe_nutrients where id=$1 order by nutrient',[r.id]);
  if(cmd==='allergens') return db.query('select i.code,i.name,i.allergens,i.source from recipe_lines l join ingredients i on i.id=l.ingredient_id where l.recipe_id=$1 order by i.code',[r.id]);
  const grams=number(required(f.grams,'--grams'),'grams');if(!r.yield_g||grams<=0)throw Error('Positive recorded yield and target grams required');
  return db.query('select i.code,i.name,round(l.grams*$2/$3,3) as grams from recipe_lines l join ingredients i on i.id=l.ingredient_id where l.recipe_id=$1 order by i.code',[r.id,grams,r.yield_g]);
 }
 if(cmd==='compare') {
  if(pos.length!==2)throw Error('compare needs two recipes');
  const a=await resolve(db,'recipes',pos[0]),b=await resolve(db,'recipes',pos[1]);
  return db.query('select a.nutrient,a.unit,a.per_100g as first_per_100g,b.per_100g as second_per_100g,b.per_100g-a.per_100g as difference from recipe_nutrients a join recipe_nutrients b on a.nutrient=b.nutrient where a.id=$1 and b.id=$2 order by a.nutrient',[a.id,b.id]);
 }
 if(cmd==='where-used') {const i=await resolve(db,'ingredients',one());return db.query('select r.code,r.name,l.grams,r.stage from recipe_lines l join recipes r on r.id=l.recipe_id where l.ingredient_id=$1 order by r.code',[i.id]);}
 if(cmd==='insights') {
  if(pos.length>1)throw Error('insights takes at most one question key');
  const selected=pos.length?questions.filter(q=>q[0]===pos[0]):questions;
  if(!selected.length)throw Error('Unknown insight key');
  const result=[];for(const [key,question,sql] of selected) result.push({key,question,rows:await db.query(sql)});return result;
 }
 if(cmd==='weekly-review') {
  noArgs();const sections=[];
  for(const c of ['attention','costs','spec-renewals']) sections.push(`## ${c}\n\n${format(await run(db,[c]))}`);
  return writeDraft('weekly-review',`# Formulation review\n\n${sections.join('\n\n')}\n\nDraft for the technical manager. No labels approved.\n`);
 }
 if(cmd==='draft-spec-request') {
  const i=await resolve(db,'ingredients',one());const usage=await run(db,['where-used',i.code]);
  return writeDraft('supplier-specification',`# Supplier specification request: ${i.name}\n\nTo: ${i.supplier || '[supplier not recorded]'}\n\nPlease provide the current nutrient specification per 100 g, allergen declaration, cost and review date for ${i.name}.\n\nRecipes affected:\n${format(usage)}\n\nDraft only. Check the recipient and wording before sending.\n`);
 }
 if(cmd==='export') {
  noArgs(); const dir=path.resolve(outputRoot(),f.out||`exports/${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}`);
  if(fs.existsSync(dir))throw Error('Export directory already exists; choose a new directory');
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const counts={};await db.exec('begin read only');
  try {for(const t of tables){const rows=await db.query(`select * from ${t} order by id`);fs.writeFileSync(path.join(dir,`${t}.csv`),csv(rows),{mode:0o600});counts[t]=rows.length;}await db.exec('commit');}
  catch(e){await db.exec('rollback');throw e;}
  return {directory:dir,counts};
 }
 const actor=required(f.by,'--by');
 if(cmd.startsWith('add-')||cmd.startsWith('set-')&&cmd!=='set-line') {
  const table=cmd.endsWith('ingredient')?'ingredients':'recipes';
  const allowed=table==='ingredients'?ingredientFields:recipeFields;
  const data=values(f,allowed);if(!Object.keys(data).length)throw Error('No values supplied');
  return transaction(db,async()=>{
   let row;
   if(cmd.startsWith('add-')) {
    noArgs();data.code=required(f.code,'--code');required(data.name,'--name');
    const keys=Object.keys(data);row=(await db.query(`insert into ${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data)))[0];
   } else {
    const before=await resolve(db,table,one());const keys=Object.keys(data);
    row=(await db.query(`update ${table} set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(data),before.id]))[0];
    await audit(db,actor,`${cmd}:before`,before.id,before);
   }
   await audit(db,actor,cmd,row.id,data);return row;
  });
 }
 if(cmd==='set-line') {
  const r=await resolve(db,'recipes',one());const i=await resolve(db,'ingredients',required(f.ingredient,'--ingredient'));
  const grams=number(required(f.grams,'--grams'),'grams');if(!grams)throw Error('grams must be positive');
  return transaction(db,async()=>{
   const before=await db.query('select * from recipe_lines where recipe_id=$1 and ingredient_id=$2',[r.id,i.id]);
   const row=(await db.query('insert into recipe_lines(recipe_id,ingredient_id,grams) values($1,$2,$3) on conflict(recipe_id,ingredient_id) do update set grams=excluded.grams returning *',[r.id,i.id,grams]))[0];
   await audit(db,actor,cmd,row.id,{before,after:row});return row;
  });
 }
 if(cmd==='log') {
  const r=await resolve(db,f.ingredient?'ingredients':'recipes',one());const body=required(f.text,'--text');
  return transaction(db,async()=>{const row=(await db.query(`insert into notes(${f.ingredient?'ingredient_id':'recipe_id'},author,body) values($1,$2,$3) returning *`,[r.id,actor,body]))[0];await audit(db,actor,cmd,row.id,{record:r.code});return row;});
 }
 if(cmd==='review') {
  const term=one();const note=required(f.note,'--note');
  return transaction(db,async()=>{
   const r=await resolve(db,'recipes',term);
   const failures=await db.query("select rule,problem from compliance_findings where recipe_id=$1 and rule<>'REVIEW-01'",[r.id]);
   if(failures.length)throw Error(`Review blocked:\n${format(failures)}`);
   if(!r.review_due||r.review_due<new Date().toISOString().slice(0,10))throw Error('Set a current review_due date first');
   const snap=await snapshot(db,r);
   const row=(await db.query('insert into reviews(recipe_id,reviewer,note,snapshot) values($1,$2,$3,$4) returning id,reviewer,created_at',[r.id,actor,note,JSON.stringify(snap)]))[0];
   await audit(db,actor,cmd,r.id,{review_id:row.id});return {...row,meaning:'Technical record review only; not label release or certification'};
  });
 }
 if(cmd==='import') {
  if(pos.length!==2)throw Error('import needs genesis-rd|csv and a path');
  if(!['genesis-rd','csv'].includes(pos[0]))throw Error('Unknown import source');
  const file=path.resolve(pos[1]);const raw=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
  if(!raw.trim()||raw.includes('\u0000')||raw.includes('\ufffd'))throw Error('Input must be nonempty UTF-8 text; convert legacy encodings first');
  if(pos[0]==='genesis-rd') {
   if(path.extname(file).toLowerCase()!=='.txt')throw Error('Genesis native import accepts Recipe Analysis or Report Sections .txt exports, not EXL or licensed databases');
   if(f.kind||f.map)throw Error('Native text is preserved unchanged; use csv for mapped records');
   const r=await resolve(db,'recipes',required(f.recipe,'--recipe'));
   const hash=createHash('sha256').update(raw).digest('hex');
   return transaction(db,async()=>{
    const row=await db.query('insert into source_exports(recipe_id,filename,sha256,raw_text,imported_by) values($1,$2,$3,$4,$5) on conflict(recipe_id,sha256) do nothing returning id',[r.id,path.basename(file),hash,raw,actor]);
    if(row.length)await audit(db,actor,'import:genesis-rd',r.id,{sha256:hash,filename:path.basename(file)});
    return {imported:row.length,unchanged:row.length?0:1,dry_run:!!f['dry-run'],recipe:r.code,scope:'Source report preserved. Ingredient quantities and nutrient values require explicit mapping; no calculation inputs overwritten.'};
   },!!f['dry-run']);
  }
  const kind=required(f.kind,'--kind');if(!['ingredients','recipes','lines'].includes(kind))throw Error('kind must be ingredients, recipes or lines');
  const rows=parseCsv(raw);if(!rows.length)throw Error('No CSV rows');
  const mapping=f.map?JSON.parse(fs.readFileSync(f.map,'utf8')):null;
  const allowed=kind==='ingredients'?['code',...ingredientFields]:kind==='recipes'?['code',...recipeFields]:['recipe','ingredient','grams'];
  if(mapping && (typeof mapping!=='object'||Array.isArray(mapping)))throw Error('Mapping must be an object of destination field to source header');
  if(mapping)for(const [key,header] of Object.entries(mapping)){if(!allowed.includes(key)||typeof header!=='string'||!Object.hasOwn(rows[0],header))throw Error(`Invalid mapping ${key}`);}
  const mapped=rows.map(row=>{
   const out={};for(const key of allowed){const header=mapping?mapping[key]:key;if(header&&Object.hasOwn(row,header)&&row[header]!=='')out[key]=row[header];}
   if(!mapping)for(const key of Object.keys(row))if(!allowed.includes(key))throw Error(`Unknown CSV column ${key}; supply --map`);
   return out;
  });
  const keys=new Set();for(const r of mapped){const key=kind==='lines'?`${required(r.recipe,'recipe')}|${required(r.ingredient,'ingredient')}`:required(r.code,'code');if(keys.has(key.toLowerCase()))throw Error(`Duplicate import key ${key}`);keys.add(key.toLowerCase());}
  return transaction(db,async()=>{
   let inserted=0,updated=0;const previous=[];
   for(const row of mapped) {
    if(kind==='lines') {
     const r=await resolve(db,'recipes',row.recipe),i=await resolve(db,'ingredients',row.ingredient);const grams=number(required(row.grams,'grams'),'grams');if(!grams)throw Error('grams must be positive');
     const prior=await db.query('select * from recipe_lines where recipe_id=$1 and ingredient_id=$2',[r.id,i.id]);
     previous.push(...prior);
     await db.query('insert into recipe_lines(recipe_id,ingredient_id,grams) values($1,$2,$3) on conflict(recipe_id,ingredient_id) do update set grams=excluded.grams where recipe_lines.grams is distinct from excluded.grams',[r.id,i.id,grams]);
     prior.length?updated++:inserted++;continue;
    }
    const code=required(row.code,'code');const data=values(row,kind==='ingredients'?ingredientFields:recipeFields);
    const prior=await db.query(`select * from ${kind} where code=$1`,[code]);
    previous.push(...prior);
    if(!prior.length)required(data.name,'name');
    const cols=['code',...Object.keys(data)];if(cols.length<2)throw Error('Import row has no mapped fields');
    const changes=Object.keys(data);
    if(prior.length) await db.query(`update ${kind} set ${changes.map((k,i)=>`${k}=$${i+2}`).join(',')} where code=$1 and (${changes.map((k,i)=>`${k} is distinct from $${i+2}`).join(' or ')})`,[code,...Object.values(data)]);
    else await db.query(`insert into ${kind}(${cols.join(',')}) values(${cols.map((_,i)=>'$'+(i+1)).join(',')})`,[code,...Object.values(data)]);
    prior.length?updated++:inserted++;
   }
   await audit(db,actor,`import:${kind}`,null,{file:path.basename(file),sha256:createHash('sha256').update(raw).digest('hex'),rows:mapped.length,previous});
   return {inserted,updated,dry_run:!!f['dry-run'],rows:mapped.length};
  },!!f['dry-run']);
 }
 throw Error(`Unimplemented ${cmd}`);
}
export function format(value) {
 if(!Array.isArray(value))return JSON.stringify(value,null,2);
 if(!value.length)return 'No records.';
 const keys=Object.keys(value[0]);const show=v=>v===null||v===undefined?'unknown':typeof v==='object'?JSON.stringify(v):String(v);
 const rows=value.map(row=>keys.map(k=>show(row[k])));
 const widths=keys.map((k,i)=>Math.min(90,Math.max(k.length,...rows.map(r=>r[i].length))));
 const line=r=>r.map((v,i)=>v.padEnd(widths[i])).join(' | ');
 return [line(keys),widths.map(w=>'-'.repeat(w)).join('-+-'),...rows.map(line)].join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 let db;try {const args=process.argv.slice(2);parse(args);db=await getDb();const out=await run(db,args);console.log(args.includes('--json')?JSON.stringify(out,null,2):format(out));}
 catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
