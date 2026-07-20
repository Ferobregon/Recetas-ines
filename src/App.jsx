import{useState,useEffect,useRef}from'react'
import{uploadPhoto,fetchRecipes,insertRecipe,updateRecipe,deleteRecipe}from'./supabase.js'
const C={bg:'#F5F0E8',surface:'#FFFDF9',border:'#E8DED0',green:'#4A7C59',greenBg:'#EDF4EF',greenDark:'#2D5238',amber:'#B8763A',amberBg:'#FDF4E8',text:'#2C2416',textSec:'#7A6E5F',textMuted:'#B0A090',danger:'#C0392B'}
const MT={desayuno:{bg:'#FEF8ED',tx:'#9A6B2A',ac:'#D4943A'},comida:{bg:'#EDF4EF',tx:'#2D5238',ac:'#4A7C59'},cena:{bg:'#F0EDF8',tx:'#4A3A7A',ac:'#7B6BBD'},botana:{bg:'#FDF0EC',tx:'#8A3020',ac:'#C05A40'}}
const HT={sano:{bg:'#EDF4EF',tx:'#2D5238'},balanceado:{bg:'#EDF0F8',tx:'#2D3A6A'},indulgente:{bg:'#FEF8ED',tx:'#8A5A1A'}}
const MTAGS=['desayuno','comida','cena','botana']
const CTAGS=['plato fuerte','verdura','sopa','acompañamiento','fruta','postre']
const ATAGS=['fer','inés','todos']
const HTAGS=['sano','balanceado','indulgente']
const serif=`Georgia,'Palatino Linotype',serif`
const sans=`-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`
const S={
  app:{height:'100dvh',width:'100%',maxWidth:430,margin:'0 auto',display:'flex',flexDirection:'column',background:C.bg,position:'relative',overflow:'hidden',fontFamily:sans},
  screen:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'},
  scroll:{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch'},
  header:{padding:'52px 20px 16px',background:C.surface,borderBottom:`0.5px solid ${C.border}`,flexShrink:0},
  card:{background:C.surface,borderRadius:16,border:`0.5px solid ${C.border}`,padding:14,display:'flex',gap:14,alignItems:'flex-start',cursor:'pointer'},
  pill:(bg,tx,small)=>({display:'inline-flex',alignItems:'center',gap:3,padding:small?'3px 9px':'5px 12px',borderRadius:999,fontSize:small?11:12,fontWeight:500,whiteSpace:'nowrap',background:bg,color:tx}),
  tog:(active,abg,atx)=>({padding:'8px 14px',borderRadius:999,fontSize:13,cursor:'pointer',userSelect:'none',border:active?'none':`0.5px solid ${C.border}`,background:active?abg:C.surface,color:active?atx:C.textSec}),
  input:{width:'100%',padding:'11px 14px',borderRadius:12,border:`0.5px solid ${C.border}`,fontSize:15,background:C.surface,outline:'none',color:C.text,fontFamily:sans},
  label:{fontSize:11,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:6,fontWeight:500},
  btn:(bg,tx)=>({background:bg,color:tx,border:'none',borderRadius:12,padding:'14px',fontSize:16,fontWeight:600,cursor:'pointer',width:'100%',fontFamily:sans}),
  fab:{position:'absolute',bottom:28,right:20,width:56,height:56,borderRadius:'50%',background:C.green,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:20},
  divider:{height:'0.5px',background:C.border,margin:'16px 0'},
  sec:{fontSize:11,color:C.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10,display:'block',fontWeight:500},
}
const Pill=({label,bg,tx,small,onX})=>(
  <span style={S.pill(bg,tx,small)} onClick={onX?e=>{e.stopPropagation();onX()}:undefined}>
    {label}{onX&&<span style={{fontSize:14,marginLeft:2}}>×</span>}
  </span>
)
const Toggle=({label,active,abg,atx,onClick})=>(<span style={S.tog(active,abg,atx)} onClick={onClick}>{label}</span>)
const Icon=({name,size=20,color='currentColor',style:st})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={st}>
    {name==='back'&&<polyline points="15 18 9 12 15 6"/>}
    {name==='plus'&&<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}
    {name==='search'&&<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}
    {name==='filter'&&<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>}
    {name==='x'&&<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
    {name==='trash'&&<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>}
    {name==='edit'&&<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>}
    {name==='camera'&&<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>}
    {name==='users'&&<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
    {name==='clock'&&<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
    {name==='refresh'&&<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>}
    {name==='book'&&<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>}
    {name==='pencil'&&<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>}
    {name==='link'&&<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>}
    {name==='user'&&<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}
  </svg>
)
function RecipeCard({r,onClick}){
  const th=MT[r.moment_tags?.[0]]
  return(
    <div style={S.card} onClick={onClick}>
      <div style={{width:68,height:68,borderRadius:14,flexShrink:0,overflow:'hidden',background:th?th.bg+'88':C.border,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {r.photo_url?<img src={r.photo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>:<span style={{fontSize:28,fontWeight:700,color:th?th.ac:C.textMuted,fontFamily:serif}}>{r.title[0]}</span>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:3}}>
          <p style={{fontWeight:600,fontSize:15,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,paddingRight:8,fontFamily:serif}}>{r.title}</p>
          {r.rating&&<span style={{fontSize:12,color:C.amber,flexShrink:0,fontWeight:600}}>★ {r.rating}</span>}
        </div>
        {r.description&&<p style={{fontSize:13,color:C.textSec,margin:'0 0 8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</p>}
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {r.moment_tags?.slice(0,2).map(t=><Pill key={t} label={t} small bg={MT[t]?.bg||C.greenBg} tx={MT[t]?.tx||C.greenDark}/>)}
          {r.health_tag&&<Pill label={r.health_tag} small bg={HT[r.health_tag]?.bg||C.greenBg} tx={HT[r.health_tag]?.tx||C.greenDark}/>}
          {r.is_simple&&<Pill label="receta simple" small bg={C.border} tx={C.textMuted}/>}
        </div>
      </div>
    </div>
  )
}
function ListScreen({recipes,loading,onAdd,onSel,filters,setFilters,search,setSearch,onFilter}){
  const active=Object.values(filters).flat()
  const list=recipes.filter(r=>{
    if(search&&!r.title.toLowerCase().includes(search.toLowerCase())&&!r.description?.toLowerCase().includes(search.toLowerCase()))return false
    if(filters.mt?.length&&!filters.mt.some(t=>r.moment_tags?.includes(t)))return false
    if(filters.ct?.length&&!filters.ct.some(t=>r.category_tags?.includes(t)))return false
    if(filters.at?.length&&!filters.at.some(t=>r.audience_tags?.includes(t)))return false
    if(filters.ht?.length&&!filters.ht.includes(r.health_tag))return false
    return true
  })
  return(
    <div style={S.screen}>
      <div style={S.header}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:14}}>
          <h1 style={{fontSize:26,fontWeight:700,color:C.text,fontFamily:serif,letterSpacing:'-0.3px'}}>Mis recetas</h1>
          <span style={{fontSize:13,color:C.textMuted}}>{recipes.length} guardadas</span>
        </div>
        <div style={{position:'relative'}}>
          <Icon name="search" size={16} color={C.textMuted} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
          <input style={{...S.input,paddingLeft:36}} type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar recetas..."/>
        </div>
      </div>
      <div style={{padding:'10px 20px 8px',display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none',flexShrink:0,background:C.surface,borderBottom:`0.5px solid ${C.border}`}}>
        <button onClick={onFilter} style={{padding:'7px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',flexShrink:0,border:active.length?'none':`0.5px solid ${C.border}`,background:active.length?C.greenBg:C.surface,color:active.length?C.greenDark:C.textSec,display:'flex',alignItems:'center',gap:5}}>
          <Icon name="filter" size={13} color={active.length?C.greenDark:C.textSec}/>
          Filtros{active.length?` · ${active.length}`:''}
        </button>
        {active.map((v,i)=><Pill key={i} label={v} small bg={C.greenBg} tx={C.greenDark} onX={()=>setFilters(f=>{const n={...f};for(const k of Object.keys(n))n[k]=n[k].filter(x=>x!==v);return n})}/>)}
      </div>
      <div style={{...S.scroll,padding:'12px 20px 0',background:C.bg}}>
        {loading&&<div style={{textAlign:'center',padding:'60px 0',color:C.textMuted}}><p style={{fontSize:15}}>Cargando recetas...</p></div>}
        {!loading&&list.length===0&&(
          <div style={{textAlign:'center',padding:'70px 0 0',color:C.textMuted}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:C.greenBg,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <Icon name="search" size={28} color={C.green}/>
            </div>
            <p style={{fontSize:16,fontWeight:600,color:C.textSec,marginBottom:6,fontFamily:serif}}>{recipes.length===0?'Tu recetario está vacío':'Sin resultados'}</p>
            <p style={{fontSize:13,color:C.textMuted}}>{recipes.length===0?'Toca + para agregar tu primera receta':'Prueba con otros filtros'}</p>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:10,paddingBottom:100}}>
          {list.map(r=><RecipeCard key={r.id} r={r} onClick={()=>onSel(r)}/>)}
        </div>
      </div>
      <button style={S.fab} onClick={onAdd} aria-label="Agregar receta"><Icon name="plus" size={26} color="#fff"/></button>
    </div>
  )
}
function DetailScreen({r,onBack,onEdit,onDelete}){
  const th=MT[r.moment_tags?.[0]]
  const total=(r.prep_time||0)+(r.cook_time||0)
  const[delConfirm,setDelConfirm]=useState(false)
  return(
    <div style={S.screen}>
      <div style={{height:220,flexShrink:0,position:'relative',background:th?th.bg:C.greenBg,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        {r.photo_url?<img src={r.photo_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={r.title}/>:<span style={{fontSize:100,fontWeight:700,color:th?th.ac:C.green,opacity:.2,fontFamily:serif}}>{r.title[0]}</span>}
        <button style={{position:'absolute',top:52,left:16,background:'rgba(255,255,255,.88)',border:'none',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={onBack}><Icon name="back" size={20} color={C.text}/></button>
        <div style={{position:'absolute',top:52,right:16,display:'flex',gap:8}}>
          <button style={{background:'rgba(255,255,255,.88)',border:'none',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={onEdit}><Icon name="edit" size={18} color={C.text}/></button>
          <button style={{background:'rgba(255,255,255,.88)',border:'none',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>setDelConfirm(true)}><Icon name="trash" size={18} color={C.danger}/></button>
        </div>
      </div>
      <div style={{...S.scroll,background:C.bg}}>
        <div style={{background:C.surface,padding:'20px 20px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6}}>
            <h2 style={{fontSize:24,fontWeight:700,color:C.text,flex:1,fontFamily:serif,lineHeight:1.2}}>{r.title}</h2>
            {r.rating&&<span style={{color:C.amber,fontSize:15,fontWeight:700,flexShrink:0}}>★ {r.rating}</span>}
          </div>
          {r.description&&<p style={{fontSize:14,color:C.textSec,marginBottom:10,lineHeight:1.6}}>{r.description}</p>}
          {r.source_author&&<p style={{fontSize:12,color:C.textMuted,marginBottom:12,display:'flex',alignItems:'center',gap:5}}><Icon name="user" size={13} color={C.textMuted}/>{r.source_author} · {r.source_type}</p>}
          <div style={{display:'flex',gap:14,fontSize:13,color:C.textSec,marginBottom:14,flexWrap:'wrap'}}>
            <span style={{display:'flex',alignItems:'center',gap:5}}><Icon name="users" size={14} color={C.textMuted}/>{r.servings} porciones</span>
            {total>0&&<span style={{display:'flex',alignItems:'center',gap:5}}><Icon name="clock" size={14} color={C.textMuted}/>{total} min</span>}
            {r.times_made>0&&<span style={{display:'flex',alignItems:'center',gap:5}}><Icon name="refresh" size={14} color={C.textMuted}/>{r.times_made}× hecho</span>}
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,paddingBottom:16,borderBottom:`0.5px solid ${C.border}`}}>
            {r.moment_tags?.map(t=><Pill key={t} label={t} bg={MT[t]?.bg||C.greenBg} tx={MT[t]?.tx||C.greenDark}/>)}
            {r.category_tags?.map(t=><Pill key={t} label={t} bg={C.border} tx={C.textSec}/>)}
            {r.audience_tags?.map(t=><Pill key={t} label={t} bg='#F0EDF8' tx='#4A3A7A'/>)}
            {r.health_tag&&<Pill label={r.health_tag} bg={HT[r.health_tag]?.bg||C.greenBg} tx={HT[r.health_tag]?.tx||C.greenDark}/>}
          </div>
          <h3 style={{fontSize:17,fontWeight:700,margin:'18px 0 12px',color:C.text,fontFamily:serif}}>Ingredientes</h3>
          {(r.ingredients||[]).map((g,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:`0.5px solid ${C.border}`,fontSize:14}}>
              <span style={{color:C.text}}>{g.n||g.name}</span>
              <span style={{color:C.textMuted,fontWeight:500}}>{g.q||g.qty} {g.u||g.unit}</span>
            </div>
          ))}
          {!r.is_simple&&r.steps?.length>0&&<>
            <h3 style={{fontSize:17,fontWeight:700,margin:'20px 0 14px',color:C.text,fontFamily:serif}}>Preparación</h3>
            {r.steps.map((step,i)=>(
              <div key={i} style={{display:'flex',gap:14,marginBottom:14,alignItems:'flex-start'}}>
                <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,background:C.greenBg,color:C.greenDark,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>{i+1}</div>
                <p style={{fontSize:14,color:C.text,margin:0,lineHeight:1.7,paddingTop:4}}>{step}</p>
              </div>
            ))}
          </>}
          {r.notes&&<div style={{background:C.amberBg,borderRadius:12,padding:'14px',margin:'16px 0',border:`0.5px solid #E8C87A`}}>
            <p style={{fontSize:11,color:C.amber,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Notas</p>
            <p style={{fontSize:14,color:C.text,lineHeight:1.6,margin:0}}>{r.notes}</p>
          </div>}
          <div style={{height:32}}/>
        </div>
      </div>
      {delConfirm&&(
        <div style={{position:'absolute',inset:0,background:'rgba(44,36,22,.5)',display:'flex',alignItems:'flex-end',zIndex:50}}>
          <div style={{background:C.surface,width:'100%',borderRadius:'20px 20px 0 0',padding:24}}>
            <h3 style={{fontSize:20,fontWeight:700,marginBottom:8,color:C.text,fontFamily:serif}}>Eliminar receta</h3>
            <p style={{color:C.textSec,marginBottom:20,fontSize:15,lineHeight:1.5}}>¿Seguro que quieres eliminar "{r.title}"?</p>
            <button style={{...S.btn(C.danger,'#fff'),marginBottom:10}} onClick={onDelete}>Sí, eliminar</button>
            <button style={{...S.btn(C.border,C.text)}} onClick={()=>setDelConfirm(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
function FilterScreen({filters,setFilters,onBack}){
  const[loc,setLoc]=useState({...filters})
  const tog=(k,v)=>setLoc(f=>({...f,[k]:(f[k]||[]).includes(v)?f[k].filter(x=>x!==v):[...(f[k]||[]),v]}))
  const secs=[
    {k:'mt',label:'Momento del día',opts:MTAGS,abg:t=>MT[t]?.bg||C.greenBg,atx:t=>MT[t]?.tx||C.greenDark},
    {k:'ct',label:'Tipo de platillo',opts:CTAGS,abg:()=>C.greenBg,atx:()=>C.greenDark},
    {k:'at',label:'¿Para quién?',opts:ATAGS,abg:()=>'#F0EDF8',atx:()=>'#4A3A7A'},
    {k:'ht',label:'Qué tan sano',opts:HTAGS,abg:t=>HT[t]?.bg||C.greenBg,atx:t=>HT[t]?.tx||C.greenDark},
  ]
  return(
    <div style={S.screen}>
      <div style={{...S.header,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button style={{background:'none',border:'none',cursor:'pointer',color:C.textSec,fontSize:15,padding:0}} onClick={onBack}>Cancelar</button>
        <h2 style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:serif}}>Filtros</h2>
        <button style={{background:'none',border:'none',cursor:'pointer',color:C.danger,fontSize:15,padding:0}} onClick={()=>setLoc({mt:[],ct:[],at:[],ht:[]})}>Limpiar</button>
      </div>
      <div style={{...S.scroll,padding:'20px',background:C.bg}}>
        {secs.map(sec=>(
          <div key={sec.k} style={{marginBottom:26}}>
            <span style={S.sec}>{sec.label}</span>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {sec.opts.map(o=><Toggle key={o} label={o} active={(loc[sec.k]||[]).includes(o)} abg={sec.abg(o)} atx={sec.atx(o)} onClick={()=>tog(sec.k,o)}/>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{padding:'16px 20px 32px',background:C.surface,borderTop:`0.5px solid ${C.border}`,flexShrink:0}}>
        <button style={S.btn(C.green,'#fff')} onClick={()=>{setFilters(loc);onBack()}}>Aplicar filtros</button>
      </div>
    </div>
  )
}
const BLANK={title:'',description:'',ingredients:[{n:'',q:'',u:''}],steps:[''],source_type:'manual',source_author:'',servings:2,prep_time:'',cook_time:'',is_simple:false,moment_tags:[],category_tags:[],audience_tags:['todos'],health_tag:'balanceado',photo_url:null,notes:''}
function RecipeForm({initial,onBack,onSave,onSaveLabel='Guardar'}){
  const[flow,setFlow]=useState(initial?'form':'src')
  const[f,setF]=useState(initial?{...initial,ingredients:initial.ingredients?.length?initial.ingredients:[{n:'',q:'',u:''}],steps:initial.steps?.length?initial.steps:[''],moment_tags:initial.moment_tags||[],category_tags:initial.category_tags||[],audience_tags:initial.audience_tags||['todos']}:{...BLANK})
  const[err,setErr]=useState('')
  const[saving,setSaving]=useState(false)
  const[photoPreview,setPhotoPreview]=useState(initial?.photo_url||null)
  const[photoFile,setPhotoFile]=useState(null)
  const fileRef=useRef()
  const upd=(k,v)=>setF(p=>({...p,[k]:v}))
  const tog=(k,v)=>setF(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}))
  const handlePhotoExtract=async(ev)=>{
    const file=ev.target.files?.[0];if(!file)return
    setPhotoFile(file);setPhotoPreview(URL.createObjectURL(file))
    setFlow('ext');setErr('')
    try{
      const b64=await new Promise((resolve,reject)=>{
        const objUrl=URL.createObjectURL(file)
        const img=new Image()
        img.onload=()=>{
          try{
            const canvas=document.createElement('canvas')
            let w=img.width,h=img.height,MAX=900
            if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX}}
            canvas.width=w;canvas.height=h
            const ctx=canvas.getContext('2d')
            if(!ctx)throw new Error('Canvas no soportado')
            ctx.drawImage(img,0,0,w,h)
            URL.revokeObjectURL(objUrl)
            resolve(canvas.toDataURL('image/jpeg',0.65).split(',')[1])
          }catch(err){URL.revokeObjectURL(objUrl);reject(err)}
        }
        img.onerror=()=>{URL.revokeObjectURL(objUrl);reject(new Error('Error cargando imagen'))}
        img.src=objUrl
      })
      const res=await fetch('https://bhhrxotdiwdtltyitnyk.supabase.co/functions/v1/extract-recipe',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({image:b64,mimeType:'image/jpeg'})
      })
      if(!res.ok)throw new Error('HTTP '+res.status+': '+await res.text())
      const p=await res.json()
      if(p.error)throw new Error(p.error)
      setF(prev=>({...prev,...p,photo_url:prev.photo_url,source_type:prev.source_type,audience_tags:['todos'],health_tag:p.health_tag||'balanceado',moment_tags:p.moment_tags||[],category_tags:p.category_tags||[],ingredients:p.ingredients?.length?p.ingredients:[{n:'',q:'',u:''}],steps:p.steps?.length?p.steps:['']}))
    }catch(e){setErr('Error al extraer: '+(e.message||'intenta de nuevo'))}
    setFlow('form')
  }
  const handleManualPhoto=(ev)=>{const file=ev.target.files?.[0];if(!file)return;setPhotoFile(file);setPhotoPreview(URL.createObjectURL(file))}
  const updI=(i,k,v)=>setF(p=>{const a=[...p.ingredients];a[i]={...a[i],[k]:v};return{...p,ingredients:a}})
  const addI=()=>setF(p=>({...p,ingredients:[...p.ingredients,{n:'',q:'',u:''}]}))
  const delI=(i)=>setF(p=>({...p,ingredients:p.ingredients.filter((_,j)=>j!==i)}))
  const updS=(i,v)=>setF(p=>{const a=[...p.steps];a[i]=v;return{...p,steps:a}})
  const addS=()=>setF(p=>({...p,steps:[...p.steps,'']}))
  const delS=(i)=>setF(p=>({...p,steps:p.steps.filter((_,j)=>j!==i)}))
  const save=async()=>{
    if(!f.title.trim()){setErr('El nombre es obligatorio.');return}
    setSaving(true);setErr('')
    try{
      let photoUrl=f.photo_url
      if(photoFile)photoUrl=await uploadPhoto(photoFile)
      const recipe={...f,photo_url:photoUrl,times_made:f.times_made||0}
      delete recipe.id
      await onSave(recipe)
    }catch(e){setErr('Error al guardar. Intenta de nuevo.');setSaving(false)}
  }
  if(flow==='src')return(
    <div style={S.screen}>
      <div style={{...S.header,display:'flex',alignItems:'center',gap:12}}>
        <button style={{background:'none',border:'none',cursor:'pointer',padding:4}} onClick={onBack}><Icon name="back" size={22} color={C.text}/></button>
        <h2 style={{fontSize:20,fontWeight:700,color:C.text,fontFamily:serif}}>Agregar receta</h2>
      </div>
      <div style={{...S.scroll,padding:'20px',background:C.bg}}>
        <p style={{fontSize:14,color:C.textSec,marginBottom:16,lineHeight:1.6}}>¿De dónde viene esta receta?</p>
        {[{id:'photo',icon:'camera',label:'Foto de libro o pantalla',desc:'Claude la extrae automáticamente'},{id:'manual',icon:'pencil',label:'Escribir manualmente',desc:'Para recetas de memoria o simples'},{id:'instagram',icon:'link',label:'Instagram / TikTok',desc:'Guarda autor y plataforma'},{id:'youtube',icon:'link',label:'YouTube',desc:'Receta en video'},{id:'libro',icon:'book',label:'Libro o revista',desc:'Foto de la página'}].map(o=>(
          <div key={o.id} onClick={()=>{if(o.id==='photo'||o.id==='libro'){upd('source_type',o.id);fileRef.current?.click()}else{upd('source_type',o.id);setFlow('form')}}} style={{background:C.surface,border:`0.5px solid ${C.border}`,borderRadius:16,padding:'14px 16px',marginBottom:10,cursor:'pointer',display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:42,height:42,borderRadius:12,background:C.greenBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon name={o.icon} size={20} color={C.green}/></div>
            <div style={{flex:1}}>
              <p style={{fontWeight:600,fontSize:15,color:C.text,margin:0,fontFamily:serif}}>{o.label}</p>
              <p style={{fontSize:12,color:C.textMuted,margin:'3px 0 0'}}>{o.desc}</p>
            </div>
            <Icon name="back" size={16} color={C.border} style={{transform:'rotate(180deg)'}}/>
          </div>
        ))}
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoExtract}/>
      </div>
    </div>
  )
  if(flow==='ext')return(
    <div style={{...S.screen,alignItems:'center',justifyContent:'center',gap:16,padding:32,background:C.bg}}>
      <div style={{width:72,height:72,borderRadius:'50%',background:C.greenBg,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon name="search" size={32} color={C.green}/></div>
      <h2 style={{fontSize:20,fontWeight:700,color:C.text,fontFamily:serif,margin:0}}>Analizando la foto...</h2>
      <p style={{fontSize:14,color:C.textSec,textAlign:'center',margin:0,lineHeight:1.6}}>Claude está extrayendo ingredientes y pasos.</p>
    </div>
  )
  return(
    <div style={S.screen}>
      <div style={{...S.header,display:'flex',alignItems:'center',gap:12}}>
        <button style={{background:'none',border:'none',cursor:'pointer',padding:4}} onClick={onBack}><Icon name="back" size={22} color={C.text}/></button>
        <h2 style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:serif,flex:1}}>{initial?'Editar receta':'Nueva receta'}</h2>
        <button onClick={save} disabled={saving} style={{background:C.green,color:'#fff',border:'none',borderRadius:12,padding:'9px 20px',fontSize:15,fontWeight:600,cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1}}>{saving?'Guardando...':onSaveLabel}</button>
      </div>
      <div style={{...S.scroll,background:C.bg}}>
        <div style={{padding:'16px 20px',background:C.surface,marginBottom:8}}>
          {err&&<div style={{background:C.amberBg,color:C.amber,borderRadius:12,padding:'10px 14px',fontSize:14,marginBottom:14}}>{err}</div>}
          {photoPreview?(
            <div style={{marginBottom:16,borderRadius:16,overflow:'hidden',height:180,position:'relative'}}>
              <img src={photoPreview} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="Foto"/>
              <button onClick={()=>{setPhotoFile(null);setPhotoPreview(null);upd('photo_url',null)}} style={{position:'absolute',top:10,right:10,background:'rgba(44,36,22,.5)',border:'none',borderRadius:'50%',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}><Icon name="x" size={16} color="#fff"/></button>
            </div>
          ):(
            <button onClick={()=>fileRef.current?.click()} style={{width:'100%',padding:'18px',borderRadius:16,border:`1.5px dashed ${C.border}`,background:C.greenBg,cursor:'pointer',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'center',gap:10,color:C.green,fontSize:14,fontWeight:500}}><Icon name="camera" size={20} color={C.green}/>Agregar foto</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleManualPhoto}/>
          <span style={S.label}>Nombre *</span>
          <input style={{...S.input,marginBottom:12,fontFamily:serif,fontSize:17,fontWeight:600}} type="text" value={f.title} onChange={e=>upd('title',e.target.value)} placeholder="Ej. Salmón al limón"/>
          <span style={S.label}>Descripción breve</span>
          <input style={{...S.input,marginBottom:12}} type="text" value={f.description} onChange={e=>upd('description',e.target.value)} placeholder="Ej. Proteína perfecta para la comida"/>
          <span style={S.label}>Fuente / Autor</span>
          <input style={{...S.input,marginBottom:14}} type="text" value={f.source_author} onChange={e=>upd('source_author',e.target.value)} placeholder="@cuenta, Abuela Carmen, Libro..."/>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            {[['servings','Porciones'],['prep_time','Prep min'],['cook_time','Cocción min']].map(([k,l])=>(
              <div key={k} style={{flex:1}}><span style={S.label}>{l}</span><input style={S.input} type="number" min="0" value={f[k]} onChange={e=>upd(k,parseInt(e.target.value)||'')}/></div>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:C.bg,borderRadius:12,border:`0.5px solid ${C.border}`}}>
            <input type="checkbox" id="simp" checked={f.is_simple} onChange={e=>upd('is_simple',e.target.checked)} style={{width:18,height:18,cursor:'pointer',accentColor:C.green}}/>
            <label htmlFor="simp" style={{fontSize:14,color:C.text,cursor:'pointer'}}>Platillo sin receta (todos saben cómo)</label>
          </div>
        </div>
        <div style={{padding:'16px 20px',background:C.surface,marginBottom:8}}>
          <p style={{fontSize:16,fontWeight:700,color:C.text,margin:'0 0 16px',fontFamily:serif}}>Categorías</p>
          {[{label:'Momento del día',k:'moment_tags',opts:MTAGS,abg:t=>MT[t]?.bg||C.greenBg,atx:t=>MT[t]?.tx||C.greenDark},{label:'Tipo de platillo',k:'category_tags',opts:CTAGS,abg:()=>C.greenBg,atx:()=>C.greenDark}].map(sec=>(
            <div key={sec.k} style={{marginBottom:16}}>
              <span style={S.sec}>{sec.label}</span>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{sec.opts.map(o=><Toggle key={o} label={o} active={f[sec.k].includes(o)} abg={sec.abg(o)} atx={sec.atx(o)} onClick={()=>tog(sec.k,o)}/>)}</div>
            </div>
          ))}
          <span style={S.sec}>¿Para quién?</span>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>{ATAGS.map(o=><Toggle key={o} label={o} active={f.audience_tags.includes(o)} abg='#F0EDF8' atx='#4A3A7A' onClick={()=>tog('audience_tags',o)}/>)}</div>
          <span style={S.sec}>¿Qué tan sano?</span>
          <div style={{display:'flex',gap:8}}>{HTAGS.map(o=><Toggle key={o} label={o} active={f.health_tag===o} abg={HT[o]?.bg||C.greenBg} atx={HT[o]?.tx||C.greenDark} onClick={()=>upd('health_tag',o)}/>)}</div>
        </div>
        <div style={{padding:'16px 20px',background:C.surface,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <p style={{fontSize:16,fontWeight:700,color:C.text,margin:0,fontFamily:serif}}>Ingredientes</p>
            <button onClick={addI} style={{background:'none',border:'none',cursor:'pointer',color:C.green,fontSize:14,display:'flex',alignItems:'center',gap:4,fontWeight:600}}><Icon name="plus" size={14} color={C.green}/>Agregar</button>
          </div>
          {f.ingredients.map((g,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:8,alignItems:'center'}}>
              <input style={{...S.input,flex:2}} type="text" value={g.n} onChange={e=>updI(i,'n',e.target.value)} placeholder="Ingrediente"/>
              <input style={{...S.input,width:52}} type="text" value={g.q} onChange={e=>updI(i,'q',e.target.value)} placeholder="Cant."/>
              <input style={{...S.input,flex:1}} type="text" value={g.u} onChange={e=>updI(i,'u',e.target.value)} placeholder="Unid."/>
              {f.ingredients.length>1&&<button onClick={()=>delI(i)} style={{background:'none',border:'none',cursor:'pointer',color:C.danger,padding:4,flexShrink:0}}><Icon name="x" size={16} color={C.danger}/></button>}
            </div>
          ))}
        </div>
        {!f.is_simple&&(
          <div style={{padding:'16px 20px',background:C.surface,marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <p style={{fontSize:16,fontWeight:700,color:C.text,margin:0,fontFamily:serif}}>Preparación</p>
              <button onClick={addS} style={{background:'none',border:'none',cursor:'pointer',color:C.green,fontSize:14,display:'flex',alignItems:'center',gap:4,fontWeight:600}}><Icon name="plus" size={14} color={C.green}/>Paso</button>
            </div>
            {f.steps.map((txt,i)=>(
              <div key={i} style={{display:'flex',gap:10,marginBottom:10,alignItems:'flex-start'}}>
                <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,marginTop:8,background:C.greenBg,color:C.greenDark,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>{i+1}</div>
                <textarea value={txt} onChange={e=>updS(i,e.target.value)} placeholder={`Paso ${i+1}...`} rows={2} style={{...S.input,flex:1,resize:'none',lineHeight:1.6}}/>
                {f.steps.length>1&&<button onClick={()=>delS(i)} style={{background:'none',border:'none',cursor:'pointer',color:C.danger,padding:4,flexShrink:0,marginTop:8}}><Icon name="x" size={16} color={C.danger}/></button>}
              </div>
            ))}
          </div>
        )}
        <div style={{padding:'16px 20px',background:C.surface,marginBottom:8}}>
          <span style={S.label}>Notas / tips</span>
          <textarea value={f.notes} onChange={e=>upd('notes',e.target.value)} placeholder="Trucos, variaciones, notas..." rows={3} style={{...S.input,resize:'none',lineHeight:1.6}}/>
        </div>
        <div style={{height:40}}/>
      </div>
    </div>
  )
}
export default function App(){
  const[screen,setScreen]=useState('list')
  const[recipes,setRecipes]=useState([])
  const[loading,setLoading]=useState(true)
  const[sel,setSel]=useState(null)
  const[filters,setFilters]=useState({mt:[],ct:[],at:[],ht:[]})
  const[search,setSearch]=useState('')
  useEffect(()=>{fetchRecipes().then(setRecipes).catch(console.error).finally(()=>setLoading(false))},[])
  const go=(s,d)=>{if(d!==undefined)setSel(d);setScreen(s)}
  const handleSave=async(recipe)=>{const saved=await insertRecipe(recipe);setRecipes(p=>[saved,...p]);go('list')}
  const handleUpdate=async(recipe)=>{const updated=await updateRecipe(sel.id,recipe);setRecipes(p=>p.map(r=>r.id===sel.id?updated:r));setSel(updated);go('detail',updated)}
  const handleDelete=async()=>{await deleteRecipe(sel.id);setRecipes(p=>p.filter(r=>r.id!==sel.id));go('list')}
  return(
    <div style={S.app}>
      {screen==='list'&&<ListScreen recipes={recipes} loading={loading} onAdd={()=>go('add')} onSel={r=>go('detail',r)} filters={filters} setFilters={setFilters} search={search} setSearch={setSearch} onFilter={()=>go('filter')}/>}
      {screen==='detail'&&sel&&<DetailScreen r={sel} onBack={()=>go('list')} onEdit={()=>go('edit',sel)} onDelete={handleDelete}/>}
      {screen==='add'&&<RecipeForm onBack={()=>go('list')} onSave={handleSave}/>}
      {screen==='edit'&&sel&&<RecipeForm initial={sel} onBack={()=>go('detail',sel)} onSave={handleUpdate} onSaveLabel="Actualizar"/>}
      {screen==='filter'&&<FilterScreen filters={filters} setFilters={setFilters} onBack={()=>go('list')}/>}
    </div>
  )
}
